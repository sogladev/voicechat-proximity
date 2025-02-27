package main

import (
	"log"
	"sync"

	"github.com/sogladev/voice-chat-manager/internal/config"
	"github.com/sogladev/voice-chat-manager/internal/server"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Create and start the servers
	mmoServer := server.NewMMOServer(cfg.MMOServerAddr)
	playerServer := server.NewPlayerServer(cfg.PlayerServerAddr, cfg.StaticFilesDir)

	var wg sync.WaitGroup
	// Start both servers concurrently
	wg.Add(1)
	go func() {
		defer wg.Done()
		log.Printf("Starting MMO server (loopback) on %s", cfg.MMOServerAddr)
		if err := mmoServer.ListenAndServe(); err != nil {
			log.Fatalf("MMO Server error: %v", err)
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		log.Printf("Starting Player server on %s", cfg.PlayerServerAddr)
		if err := playerServer.ListenAndServe(); err != nil {
			log.Fatalf("Player Server error: %v", err)
		}
	}()

	wg.Wait()
}
