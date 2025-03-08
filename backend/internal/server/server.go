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
	allMapData       = types.AllMapData{}
	allMapDataMutex  sync.RWMutex
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

	// Store player connection
	connectedMutex.Lock()
	connectedPlayers[payload.GUID] = conn
	connectedMutex.Unlock()

	log.Printf("Player connected: GUID=%d, Secret=%s\n",
		payload.GUID, payload.Secret)
}

func handleSignaling(_ *websocket.Conn, payload types.SignalingPayload) {
	connectedMutex.Lock()
	defer connectedMutex.Unlock()

	log.Printf("Signaling message from %d to %d: %s\n",
		payload.From, payload.To, payload.Type)

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
	allMapDataMutex.RLock()
	defer allMapDataMutex.RUnlock()

	// Pretty print with indents
	data, err := json.MarshalIndent(allMapData, "", " ")
	if err != nil {
		log.Println("Error marshaling mapPlayerPositions:", err)
		return
	}

	log.Println("Current mapPlayerPositions:", string(data))
}

// Handles incoming messages from the MMO server
func mmoServerReader(conn *websocket.Conn) {
	for {
		var msg types.WebSocketMessage
		if err := conn.ReadJSON(&msg); err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
				log.Println("MMO server closed the connection")
				break
			}
			log.Println("read error WebSocketMessage:", err)
			break
		}

		switch msg.Type {
		case types.MessageTypeAllMaps:
			var payload types.AllMapsPayload
			if data, err := json.Marshal(msg.Payload); err == nil {
				if err := json.Unmarshal(data, &payload); err == nil {
					handleAllMapsUpdate(payload)
				}
			}
		}
	}
}

// Filters player data and sends to connected clients
// data of nearby players, including self, from the same map
func broadcastPlayerUpdates() {
	allMapDataMutex.RLock()
	connectedMutex.RLock()
	defer allMapDataMutex.RUnlock()
	defer connectedMutex.RUnlock()

	for playerGUID, conn := range connectedPlayers {
		player, err := allMapData.GetPlayerByGUID(playerGUID)
		if err != nil {
			log.Printf("Player %d is connected, but could not be found in any map!", playerGUID)
			continue
		}

		playersInMap, err := allMapData.GetPlayersByMapId(player.MapID)
		if err != nil {
			log.Printf("Could not find players in map %d", player.MapID)
			continue
		}

		nearbyPlayers := make([]types.Player, 0)
		for _, p := range playersInMap {
			if p.GUID != playerGUID {
				// Ignore z distance
				// dx := p.Position.X - player.Position.X
				// dy := p.Position.Y - player.Position.Y
				// if dx*dx+dy*dy <= (model.DISCONNECT_DISTANCE * model.DISCONNECT_DISTANCE) {
				nearbyPlayers = append(nearbyPlayers, p)
				// }
			}
		}

		update := types.WebSocketMessage{
			Type: types.MessageTypePosition,
			Payload: types.NearbyPlayersPayload{
				Player:        player,
				NearbyPlayers: nearbyPlayers,
			},
		}

		if err := conn.WriteJSON(update); err != nil {
			log.Printf("Error sending to player %d: %v", playerGUID, err)
		}
	}
}

func handleAllMapsUpdate(payload types.AllMapsPayload) {
	allMapDataMutex.Lock()
	allMapData = payload.Data
	allMapDataMutex.Unlock()

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
