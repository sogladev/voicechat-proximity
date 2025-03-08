package model

const (
	// Add extra buffer to the max distance to avoid frequent disconnects/reconnects
	MAX_DISCONNECT_DISTANCE = VISIBILITY_DISTANCE_NORMAL * 1.5
	// Constants from MMO
	CONTACT_DISTANCE             = 0.5
	INTERACTION_DISTANCE         = 5.5
	ATTACK_DISTANCE              = 5.0
	VISIBILITY_COMPENSATION      = 15.0
	INSPECT_DISTANCE             = 28.0
	VISIBILITY_INC_FOR_GOBJECTS  = 30.0
	SPELL_SEARCHER_COMPENSATION  = 30.0
	TRADE_DISTANCE               = 11.11
	MAX_VISIBILITY_DISTANCE      = 250.0
	SIGHT_RANGE_UNIT             = 50.0
	MAX_SEARCHER_DISTANCE        = 150.0
	VISIBILITY_DISTANCE_INFINITE = 533.0
	VISIBILITY_DISTANCE_GIGANTIC = 400.0
	VISIBILITY_DISTANCE_LARGE    = 200.0
	VISIBILITY_DISTANCE_NORMAL   = 100.0
	VISIBILITY_DISTANCE_SMALL    = 50.0
	VISIBILITY_DISTANCE_TINY     = 25.0
	DEFAULT_VISIBILITY_DISTANCE  = 100.0
	DEFAULT_VISIBILITY_INSTANCE  = 170.0
	VISIBILITY_DIST_WINTERGRASP  = 175.0
	DEFAULT_VISIBILITY_BGARENAS  = 250.0
)
