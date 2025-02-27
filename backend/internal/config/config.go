package config

import "os"

type Config struct {
	MMOServerAddr    string
	PlayerServerAddr string
	StaticFilesDir   string
}

func Load() Config {
	mmoServerAddr := os.Getenv("MMO_SERVER_ADDR")
	if mmoServerAddr == "" {
		mmoServerAddr = "127.0.0.1:22141"
	}

	playerServerAddr := os.Getenv("PLAYER_SERVER_ADDR")
	if playerServerAddr == "" {
		playerServerAddr = "0.0.0.0:22142"
	}

	staticFilesDir := os.Getenv("STATIC_FILES_DIR")
	if staticFilesDir == "" {
		staticFilesDir = "./frontend/dist"
	}

	return Config{
		MMOServerAddr:    mmoServerAddr,
		PlayerServerAddr: playerServerAddr,
		StaticFilesDir:   staticFilesDir,
	}
}
