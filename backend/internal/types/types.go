package types

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
	O float64 `json:"o"`
}

type Player struct {
	GUID     string   `json:"guid"`
	Name     string   `json:"name"`
	Position Position `json:"position"`
	Alive    bool     `json:"alive"`
	Zone     int      `json:"zone"`
	Area     int      `json:"area"`
	MapID    int      `json:"mapId"`
}

type MapData struct {
	MapID   int      `json:"mapId"`
	Players []Player `json:"players"`
}

type PositionUpdate struct {
	Message string    `json:"message"`
	Data    []MapData `json:"data"`
}

// PlayerConnection is used to authenticate a player
type PlayerConnection struct {
	GUID   string `json:"guid"`
	Secret string `json:"secret"`
}
