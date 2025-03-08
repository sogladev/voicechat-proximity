// Define constants from MMO
export const CONTACT_DISTANCE = 0.5;
export const INTERACTION_DISTANCE = 5.5;
export const ATTACK_DISTANCE = 5.0;
export const VISIBILITY_COMPENSATION = 15.0;
export const INSPECT_DISTANCE = 28.0;
export const VISIBILITY_INC_FOR_GOBJECTS = 30.0;
export const SPELL_SEARCHER_COMPENSATION = 30.0;
export const TRADE_DISTANCE = 11.11;
export const MAX_VISIBILITY_DISTANCE = 250.0;
export const SIGHT_RANGE_UNIT = 50.0;
export const MAX_SEARCHER_DISTANCE = 150.0;
export const VISIBILITY_DISTANCE_INFINITE = 533.0;
export const VISIBILITY_DISTANCE_GIGANTIC = 400.0;
export const VISIBILITY_DISTANCE_LARGE = 200.0;
export const VISIBILITY_DISTANCE_NORMAL = 100.0;
export const VISIBILITY_DISTANCE_SMALL = 50.0;
export const VISIBILITY_DISTANCE_TINY = 25.0;
export const DEFAULT_VISIBILITY_DISTANCE = 100.0;
export const DEFAULT_VISIBILITY_INSTANCE = 170.0;
export const VISIBILITY_DIST_WINTERGRASP = 175.0;
export const DEFAULT_VISIBILITY_BGARENAS = 250.0;
// Define thresholds and limits.
export const AUDIBLE_DISTANCE = VISIBILITY_DISTANCE_NORMAL;
// Distance threshold to initiate a connection.
export const CONNECT_DISTANCE = VISIBILITY_DISTANCE_NORMAL * 1.25;
// Decided server-side, defined for safety. Slightly larger threshold to avoid flickering.
export const DISCONNECT_DISTANCE = VISIBILITY_DISTANCE_NORMAL * 1.50;
export const MAX_PEERS = 20; // Maximum active connections.
