import type { Player } from "@/types/types";

/**
 * Helper: Compute Euclidean Squared distance between two players.
 */
export function calculatePlayerDistanceSq(p1: Player, p2: Player): number {
    const dx = p1.position.x - p2.position.x;
    const dy = p1.position.y - p2.position.y;
    return dx * dx + dy * dy;
}
