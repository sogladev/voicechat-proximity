package server

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/sogladev/voice-chat-manager/internal/types"
)

var (
	// map[mapID]map[playerGUID]Player
	mapPlayerPositions = make(map[int]map[int]types.Player)
	positionsMutex     sync.RWMutex
	// map[playerGUID]*websocket.Conn
	connectedPlayers = make(map[int]*websocket.Conn)
	connectedMutex   sync.RWMutex
)

// Upgrade HTTP to WebSocket
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024 * 1024 * 50,                           // 50 MB
	WriteBufferSize: 1024 * 1024 * 50,                           // 50 MB
	CheckOrigin:     func(r *http.Request) bool { return true }, // Allow all connections
}

func handlePlayerWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}

	// Create a variable to store the player's GUID
	var playerGUID int

	// Set up cleanup on exit
	defer func() {
		if playerGUID != 0 {
			connectedMutex.Lock()
			delete(connectedPlayers, playerGUID)
			connectedMutex.Unlock()
		}
		conn.Close()
	}()

	for {
		var msg types.WebSocketMessage
		if err := conn.ReadJSON(&msg); err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
				log.Println("Client closed the connection")
				break
			}
			log.Println("read error WebSocketMessage :", err)
			break
		}

		switch msg.Type {
		case types.MessageTypeConnect:
			var payload types.ConnectPayload
			if data, err := json.Marshal(msg.Payload); err == nil {
				if err := json.Unmarshal(data, &payload); err == nil {
					handleConnect(conn, payload)
					playerGUID = payload.GUID
				}
			}

		case types.MessageTypeSignaling:
			var payload types.SignalingPayload
			if data, err := json.Marshal(msg.Payload); err == nil {
				if err := json.Unmarshal(data, &payload); err == nil {
					handleSignaling(conn, payload)
				}
			}
		}
	}
}

func handleConnect(conn *websocket.Conn, payload types.ConnectPayload) {
	// TODO: Use the GUID and secret to link the player
	log.Printf("Player connected: GUID=%d, Secret=%s\n",
		payload.GUID, payload.Secret)

	// Store player connection
	connectedMutex.Lock()
	connectedPlayers[payload.GUID] = conn
	connectedMutex.Unlock()

	log.Printf("Player %d connected!", payload.GUID)
}

func handleSignaling(_ *websocket.Conn, payload types.SignalingPayload) {
	connectedMutex.Lock()
	defer connectedMutex.Unlock()
	for playerGUID, conn := range connectedPlayers {
		// Skip the player that sent the signaling message
		if playerGUID == payload.From {
			continue
		}

		msg := types.WebSocketMessage{
			Type:    types.MessageTypeSignaling,
			Payload: payload,
		}
		conn.WriteJSON(msg)
	}
}

func NewMMOServer(addr string) *http.Server {
	// Server for MMO connection (private, loopback only)
	mmoMux := http.NewServeMux()
	mmoMux.HandleFunc("/", handleMMOWebSocket)
	mmoServer := &http.Server{
		Addr:    addr,
		Handler: mmoMux,
	}
	return mmoServer
}

// Debugging function to print the current mapPlayerPositions map
func printMapPlayerPositions() {
	positionsMutex.RLock()
	defer positionsMutex.RUnlock()

	data, err := json.MarshalIndent(mapPlayerPositions, "", "  ")
	if err != nil {
		log.Println("Error marshaling mapPlayerPositions:", err)
		return
	}

	log.Println("Current mapPlayerPositions:", string(data))
}

// Handles incoming messages from the MMO server
func mmoServerReader(conn *websocket.Conn) {
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println("read error:", err)
			return
		}

		log.Printf("Received message from MMO server: %s", string(message))

		var update types.PlayerInMapPayload
		if err := json.Unmarshal(message, &update); err != nil {
			log.Println("json unmarshal error:", err)
			continue
		}

		var msg types.WebSocketMessage
		if err := conn.ReadJSON(&msg); err != nil {
			log.Println("read error:", err)
			break
		}

		if msg.Type == types.MessageTypeAllMaps {
			var payload types.AllMapsPayload
			if data, err := json.Marshal(msg.Payload); err == nil {
				if err := json.Unmarshal(data, &payload); err == nil {
					handleAllMapsUpdate(conn, payload)
				}
			}
		}
	}
}

// Filters player data and sends to connected clients
func broadcastPlayerUpdates() {
	positionsMutex.RLock()
	connectedMutex.RLock()
	defer positionsMutex.RUnlock()
	defer connectedMutex.RUnlock()

	for playerGUID, conn := range connectedPlayers {
		// Find player's map
		var playerMap int
		playerFound := false
		for mapID, players := range mapPlayerPositions {
			if _, exists := players[playerGUID]; exists {
				playerMap = mapID
				playerFound = true
				break
			}
		}

		if !playerFound {
			log.Printf("Player %d could not be found in any map!", playerGUID)
			break
		}

		// Get nearby players, including self, from the same map
		nearbyPlayers := make([]types.Player, 0)
		if players, exists := mapPlayerPositions[playerMap]; exists {
			// Retrieve the base player's position from the map
			basePlayer := players[playerGUID]
			for _, p := range players {
				// Ignore z distance
				dx := p.Position.X - basePlayer.Position.X
				dy := p.Position.Y - basePlayer.Position.Y
				if dx*dx+dy*dy <= 100*100 { // 100 max
					nearbyPlayers = append(nearbyPlayers, p)
				}
			}
		}

		update := types.WebSocketMessage{
			Type: types.MessageTypePosition,
			Payload: types.PlayerInMapPayload{
				MapID:   playerMap,
				Players: nearbyPlayers,
			},
		}

		if err := conn.WriteJSON(update); err != nil {
			log.Printf("Error sending to player %d: %v", playerGUID, err)
		}
	}
}

func handleAllMapsUpdate(_ *websocket.Conn, payload types.AllMapsPayload) {
	newPositions := make(map[int]map[int]types.Player)
	for _, mapData := range payload.Data {
		players := make(map[int]types.Player)
		for _, player := range mapData.Players {
			players[player.GUID] = player
		}
		newPositions[mapData.MapID] = players
	}
	positionsMutex.Lock()
	mapPlayerPositions = newPositions
	positionsMutex.Unlock()

	// Print the updated mapPlayerPositions for debugging
	printMapPlayerPositions()

	// Notify connected player clients with personalized data
	broadcastPlayerUpdates()
}

func handleMMOWebSocket(w http.ResponseWriter, r *http.Request) {
	// Upgrade the HTTP request to a WebSocket connection
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer ws.Close()

	log.Println("MMO server connected!")

	// Read messages from the MMO server
	mmoServerReader(ws)
}

func NewPlayerServer(addr, staticFilesDir string) *http.Server {
	// Server for Player connection (public, external)
	playerMux := http.NewServeMux()
	playerMux.HandleFunc("/ws", handlePlayerWebSocket)

	// Create a file server for serving static files
	staticFileServer := http.FileServer(http.Dir(staticFilesDir))

	// Create a ServeMux for handling both static files and WebSocket connections
	mainMux := http.NewServeMux()
	mainMux.Handle("/ws", playerMux)
	mainMux.Handle("/", staticFileServer)

	// Create and start the HTTP server
	playerServer := &http.Server{
		Addr:    addr,
		Handler: mainMux,
	}

	return playerServer
}
