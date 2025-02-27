package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/sogladev/voice-chat-manager/internal/types"

	"github.com/gorilla/websocket"
)

var (
	// map[mapID]map[playerGUID]Player
	mapPlayerPositions = make(map[int]map[string]types.Player)
	positionsMutex     sync.RWMutex
	// map[playerGUID]*websocket.Conn
	connectedPlayers = make(map[string]*websocket.Conn)
	connectedMutex   sync.RWMutex
)

// Upgrade HTTP to WebSocket
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024 * 1024 * 50,                           // 50 MB
	WriteBufferSize: 1024 * 1024 * 50,                           // 50 MB
	CheckOrigin:     func(r *http.Request) bool { return true }, // Allow all connections
}

func handlePlayerWebSocket(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}

	// Read initial player connection details
	_, message, err := ws.ReadMessage()
	if err != nil {
		log.Println("Player handshake error:", err)
		ws.Close()
		return
	}

	// Unmarshal the initial message into a PlayerConnection struct
	var playerConn types.PlayerConnection
	if err := json.Unmarshal(message, &playerConn); err != nil {
		log.Println("PlayerConnection JSON unmarshal error:", err)
		return
	}

	// TODO: Use the GUID and secret to link the player
	log.Printf("Player connected: GUID=%s, Secret=%s\n",
		playerConn.GUID, playerConn.Secret)

	// Store player connection
	connectedMutex.Lock()
	connectedPlayers[playerConn.GUID] = ws
	connectedMutex.Unlock()

	defer func() {
		connectedMutex.Lock()
		delete(connectedPlayers, playerConn.GUID)
		connectedMutex.Unlock()
		ws.Close()
	}()

	log.Printf("Player %s connected!", playerConn.GUID)

	// Keep connection open
	for {
		_, _, err := ws.ReadMessage()
		if err != nil {
			log.Println("Player WebSocket read error:", err)
			break
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
		var playerMap int = 0
		for mapID, players := range mapPlayerPositions {
			if _, exists := players[playerGUID]; exists {
				playerMap = mapID
				break
			}
		}

		if playerMap == 0 {
			log.Printf("Player %s could not be found in any map!", playerGUID)
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
				if dx*dx+dy*dy <= 50*50 {
					nearbyPlayers = append(nearbyPlayers, p)
				}
			}
		}

		// Send update to player
		update := types.PositionUpdate{
			Message: "positions",
			Data: []types.MapData{{
				MapID:   playerMap,
				Players: nearbyPlayers,
			}},
		}

		data, _ := json.Marshal(update)
		log.Printf("Sending update to player %s: %s", playerGUID, string(data))
		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			log.Printf("Error sending to player %s: %v", playerGUID, err)
		}
	}
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

		var update types.PositionUpdate
		if err := json.Unmarshal(message, &update); err != nil {
			log.Println("json unmarshal error:", err)
			continue
		}

		if update.Message == "positions" {
			newPositions := make(map[int]map[string]types.Player)
			for _, mapData := range update.Data {
				players := make(map[string]types.Player)
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
	}
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

func main() {
	// Server for MMO connection (private, loopback only)
	mmoMux := http.NewServeMux()
	mmoMux.HandleFunc("/", handleMMOWebSocket)
	mmoServer := &http.Server{
		Addr:    "127.0.0.1:22141",
		Handler: mmoMux,
	}

	// Server for Player connection (public, external)
	playerMux := http.NewServeMux()
	playerMux.HandleFunc("/ws", handlePlayerWebSocket)

	// Create a file server for serving static files
	staticFileServer := http.FileServer(http.Dir("./frontend/dist"))

	// Create a ServeMux for handling both static files and WebSocket connections
	mainMux := http.NewServeMux()
	mainMux.Handle("/ws", playerMux)
	mainMux.Handle("/", staticFileServer)

	// Create and start the HTTP server
	playerServer := &http.Server{
		Addr:    "0.0.0.0:22142",
		Handler: mainMux,
	}

	// Start both servers concurrently
	go func() {
		log.Println("Starting MMO server (loopback) on 127.0.0.1:22141")
		if err := mmoServer.ListenAndServe(); err != nil {
			log.Fatalf("MMO Server error: %v", err)
		}
	}()

	go func() {
		log.Println("Starting Player server on 0.0.0.0:22142")
		if err := playerServer.ListenAndServe(); err != nil {
			log.Fatalf("Player Server error: %v", err)
		}
	}()

	// Wait forever
	select {}
}
