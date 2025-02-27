package config

type Config struct {
	MMOServerAddr    string
	PlayerServerAddr string
	StaticFilesDir   string
}

func Load() *Config {
	return &Config{
		MMOServerAddr:    "127.0.0.1:22141",
		PlayerServerAddr: "0.0.0.0:22142",
		StaticFilesDir:   "./frontend/dist",
	}
}
