/**
 * Recommendation Scoring Utilities
 *
 * Calculates recommendation fit scores and levels for project-person matching.
 * Extracted from SmartAssignmentModal to improve testability.
 */

export type FitLevel = 'excellent' | 'good' | 'partial';

export interface RecommendationScore {
  score: number;
  fitLevel: FitLevel;
  reason: string;
}

/**
 * Calculates the recommendation score for a person-project pairing
 * when the project has specific role requirements.
 *
 * @param matchingRolesCount - Number of person's roles that match project needs
 * @param totalProjectRoles - Total number of roles required by the project
 * @param suggestedRoleName - Name of the suggested role for the assignment
 * @returns Recommendation score object with score, fitLevel, and reason
 *
 * @example
 * // Person has 2 roles that match, project needs 2 roles total
 * calculateRoleBasedScore(2, 2, "Software Engineer")
 * // returns { score: 1.0, fitLevel: "excellent", reason: "Perfect match as Software Engineer" }
 *
 * @example
 * // Person has 1 role that matches, project needs 2 roles
 * calculateRoleBasedScore(1, 2, "Developer")
 * // returns { score: 0.5, fitLevel: "good", reason: "Good fit as Developer" }
 */
export function calculateRoleBasedScore(
  matchingRolesCount: number,
  totalProjectRoles: number,
  suggestedRoleName: string
): RecommendationScore {
  const score = matchingRolesCount / Math.max(totalProjectRoles, 1);
  const roleDisplay = suggestedRoleName || 'team member';

  if (score >= 0.8) {
    return {
      score,
      fitLevel: 'excellent',
      reason: `Perfect match as ${roleDisplay}`
    };
  }

  if (score >= 0.5) {
    return {
      score,
      fitLevel: 'good',
      reason: `Good fit as ${roleDisplay}`
    };
  }

  if (matchingRolesCount > 0) {
    return {
      score,
      fitLevel: 'partial',
      reason: `Can contribute as ${roleDisplay}`
    };
  }

  return {
    score,
    fitLevel: 'partial',
    reason: `Available as ${roleDisplay}`
  };
}

/**
 * Calculates the recommendation score for a person-project pairing
 * when the project has NO specific role requirements.
 *
 * In this case, scoring is based on project priority rather than role matching.
 *
 * @param projectPriority - Priority of the project (1 = highest, 2 = medium, 3+ = standard)
 * @param suggestedRoleName - Name of the suggested role for the assignment
 * @returns Recommendation score object with score, fitLevel, and reason
 *
 * @example
 * calculatePriorityBasedScore(1, "Senior Developer")
 * // returns { score: 0.9, fitLevel: "excellent", reason: "Available for high priority project as Senior Developer" }
 *
 * @example
 * calculatePriorityBasedScore(3, "Developer")
 * // returns { score: 0.5, fitLevel: "partial", reason: "Available for standard project as Developer" }
 */
export function calculatePriorityBasedScore(
  projectPriority: number,
  suggestedRoleName: string
): RecommendationScore {
  const roleDisplay = suggestedRoleName || 'team member';

  if (projectPriority === 1) {
    return {
      score: 0.9,
      fitLevel: 'excellent',
      reason: `Available for high priority project as ${roleDisplay}`
    };
  }

  if (projectPriority === 2) {
    return {
      score: 0.7,
      fitLevel: 'good',
      reason: `Available for medium priority project as ${roleDisplay}`
    };
  }

  return {
    score: 0.5,
    fitLevel: 'partial',
    reason: `Available for standard project as ${roleDisplay}`
  };
}

/**
 * Calculates suggested allocation percentage based on remaining capacity
 * and project priority.
 *
 * @param remainingCapacity - Person's remaining capacity percentage (0-100)
 * @param projectPriority - Priority of the project (1 = highest, 2 = medium, 3+ = standard)
 * @returns Suggested allocation percentage, capped at remaining capacity
 *
 * @example
 * calculateSuggestedAllocation(80, 1)
 * // returns 60 (high priority gets 60%, but capped at 80% available)
 *
 * @example
 * calculateSuggestedAllocation(30, 1)
 * // returns 30 (would suggest 60%, but only 30% available)
 */
export function calculateSuggestedAllocation(
  remainingCapacity: number,
  projectPriority: number
): number {
  const baseAllocation = projectPriority === 1 ? 60
    : projectPriority === 2 ? 40
    : 20;

  return Math.min(remainingCapacity, baseAllocation);
}
