// This needs to be in sync with the types in the backend
export interface Position {
  x: number;
  y: number;
  z: number;
  o: number;
}

export interface Player {
  guid: number;
  name: string;
  position: Position;
  alive: boolean;
  zone: number;
  area: number;
  mapId: number;
}

export interface MapData {
  mapId: number;
  players: Player[];
}

export interface PositionUpdate {
  message: string;
  data: MapData[];
}

// SignalingMessage is used to send signaling messages between players
export interface SignalingMessage {
  type: string; // e.g., "new-player", "offer", "answer", "candidate", "join"
  from: number;
  to: string;
  data: string;
}
