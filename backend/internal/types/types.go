package types

import "errors"

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
	O float64 `json:"o"`
}

type Player struct {
	GUID     int      `json:"guid"`
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

// sent by mmo-server
type AllMapsPayload struct {
	Data []MapData `json:"data"`
}

type AllMapData []MapData

func (a AllMapData) GetPlayerByGUID(guid int) (Player, error) {
	for _, mapData := range a {
		for _, p := range mapData.Players {
			if p.GUID == guid {
				return p, nil
			}
		}
	}
	return Player{}, errors.New("Player not found")
}

func (a AllMapData) GetPlayersByMapId(mapId int) ([]Player, error) {
	for _, mapData := range a {
		if mapData.MapID == mapId {
			return mapData.Players, nil
		}
	}
	return nil, errors.New("Map not found")
}

// sent by data server
type NearbyPlayersPayload struct {
	Player        Player   `json:"player"`
	NearbyPlayers []Player `json:"nearbyPlayers"`
}

const (
	// mmo-server
	MessageTypeAllMaps string = "all-maps"
	// players
	MessageTypeConnect    string = "connect"
	MessageTypePosition   string = "position"
	MessageTypeSignaling  string = "signaling"
	MessageTypeNewPlayer  string = "new-player"
	MessageTypePlayerLeft string = "player-left"
)

type WebSocketMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

type ConnectPayload struct {
	GUID   int    `json:"guid"`
	Secret string `json:"secret"`
}

type SignalingPayload struct {
	From int    `json:"from"`
	To   int    `json:"to"`
	Type string `json:"type"` // "offer", "answer", "candidate"
	Data string `json:"data"`
}
