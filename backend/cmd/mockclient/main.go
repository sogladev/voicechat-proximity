package main

import (
	"log"
	"math"
	"math/rand"
	"time"

	"github.com/sogladev/voice-chat-manager/internal/types"

	"github.com/gorilla/websocket"
)

type MockPlayer struct {
	Player types.Player
	Speed  float64
	// For predictable movement
	MovementAngle float64
	TurnRate      float64
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
				GUID:     8,
				Name:     "Alice",
				Position: types.Position{X: 0, Y: 0, Z: 0, O: 0},
				Alive:    true,
				Zone:     1,
				Area:     1,
				MapID:    0,
			},
			Speed: 0,
		},
		"player2": {
			Player: types.Player{
				GUID:     9,
				Name:     "Bob",
				Position: types.Position{X: 15, Y: 15, Z: 0, O: 0},
				Alive:    true,
				Zone:     1,
				Area:     1,
				MapID:    0,
			},
			Speed:         5,
			MovementAngle: 0,
			TurnRate:      0.02,
		},
	}

	// Update positions every 100ms
	ticker := time.NewTicker(1000 * time.Millisecond)
	// ticker := time.NewTicker(10000 * time.Millisecond)
	defer ticker.Stop()

	// Keep track of time for smooth movement
	lastTick := time.Now()

	const maxDistance = 100.0 // Maximum distance in yards

	for range ticker.C {
		now := time.Now()
		deltaTime := now.Sub(lastTick).Seconds()
		lastTick = now

		// Update player1 with random movement (unchanged)
		p1 := players["player1"]
		p1.Player.Position.X += (rand.Float64() - 0.5) * p1.Speed
		p1.Player.Position.Y += (rand.Float64() - 0.5) * p1.Speed
		// p1.Player.Position.O = rand.Float64() * 360
		p1.Player.Position.O = 0

		// Update player2 with predictable movement
		p2 := players["player2"]

		// Update movement angle for smooth turning
		p2.MovementAngle += p2.TurnRate * deltaTime * math.Pi

		// Calculate new position using circular movement
		speedFactor := p2.Speed * deltaTime
		p2.Player.Position.X += math.Cos(p2.MovementAngle) * speedFactor
		p2.Player.Position.Y += math.Sin(p2.MovementAngle) * speedFactor

		// Keep player2 within boundaries (100 yards from origin)
		distanceFromOrigin := math.Sqrt(
			p2.Player.Position.X*p2.Player.Position.X +
				p2.Player.Position.Y*p2.Player.Position.Y)

		if distanceFromOrigin > maxDistance {
			// Reverse direction when hitting boundary
			p2.MovementAngle += math.Pi

			// Scale back position to be exactly at boundary
			scale := maxDistance / distanceFromOrigin
			p2.Player.Position.X *= scale
			p2.Player.Position.Y *= scale
		}

		// Update orientation to match movement direction (in radians)
		p2.Player.Position.O = math.Mod(p2.MovementAngle, 2*math.Pi)

		// Create position update
		update := types.WebSocketMessage{
			Type: types.MessageTypeAllMaps,
			Payload: types.AllMapsPayload{
				Data: []types.MapData{
					{
						MapID: 0,
						Players: []types.Player{
							players["player1"].Player,
							players["player2"].Player,
						},
					},
				},
			},
		}

		if err := conn.WriteJSON(update); err != nil {
			log.Printf("Error sending mock data %v", err)
		}
	}
}
