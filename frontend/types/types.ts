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

export type MessageType = 'connect' | 'position' | 'signaling' // | 'new-player' | 'player-left'

export interface WebSocketMessage<T = unknown> {
    type: MessageType
    payload: T
}

export interface ConnectPayload {
    guid: number
    secret: string
}

export interface SignalingPayload {
    from: number
    to: number
    type: 'offer' | 'answer' | 'candidate';
    data: string
}

export interface NearbyPlayersPayload {
  player: Player;
  nearbyPlayers: Player[];
}