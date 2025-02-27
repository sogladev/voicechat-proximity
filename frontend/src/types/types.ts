// This needs to be in sync with the types in the backend
export interface Position {
  x: number;
  y: number;
  z: number;
  o: number;
}

export interface Player {
  guid: string;
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