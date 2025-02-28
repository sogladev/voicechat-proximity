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

// SignalingMessage is used to send signaling messages between players
// export interface SignalingMessage {
//   type: string; // e.g., "new-player", "offer", "answer", "candidate", "join"
//   from: number;
//   to: string;
//   data: string;
// }

export type MessageType = 'connect' | 'position' | 'signaling' | 'new-player' | 'player-left'

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
    to: number;
    type: 'offer' | 'answer' | 'candidate';
    data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

export interface PlayerInMapPayload {
    mapId: number
    players: Player[]
}