package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"time"

	"github.com/sogladev/voice-chat-manager/internal/types"

	"github.com/gorilla/websocket"
)

type MockPlayer struct {
	Player types.Player
	Speed  float64
}

func main() {
	// Connect to the WebSocket server
	conn, _, err := websocket.DefaultDialer.Dial("ws://localhost:22141", nil)
	if err != nil {
		log.Fatal("dial:", err)
	}
	defer conn.Close()

	// Create some mock players
	players := map[string]*MockPlayer{
		"player1": {
			Player: types.Player{
				GUID:     "player-guid-1",
				Name:     "PlayerOne",
				Position: types.Position{X: 0, Y: 0, Z: 0, O: 0},
				Alive:    true,
				Zone:     1,
				Area:     1,
				MapID:    1,
			},
			Speed: 0.1,
		},
		"player2": {
			Player: types.Player{
				GUID:     "player-guid-2",
				Name:     "PlayerTwo",
				Position: types.Position{X: 10, Y: 10, Z: 0, O: 0},
				Alive:    true,
				Zone:     1,
				Area:     1,
				MapID:    1,
			},
			Speed: 0.2,
		},
	}

	// Update positions every 100ms
	// ticker := time.NewTicker(100 * time.Millisecond)
	ticker := time.NewTicker(1000 * time.Millisecond)
	defer ticker.Stop()

	for range ticker.C {
		// Update each player position with random movement
		for _, p := range players {
			p.Player.Position.X += (rand.Float64() - 0.5) * p.Speed
			p.Player.Position.Y += (rand.Float64() - 0.5) * p.Speed
			p.Player.Position.O = rand.Float64() * 360
		}

		// Create position update
		update := types.PositionUpdate{
			Message: "positions",
			Data: []types.MapData{
				{
					MapID: 1,
					Players: []types.Player{
						players["player1"].Player,
						players["player2"].Player,
					},
				},
			},
		}

		// Send update
		data, err := json.Marshal(update)
		if err != nil {
			log.Println("marshal error:", err)
			continue
		}

		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			log.Println("write error:", err)
			return
		}
	}
}
