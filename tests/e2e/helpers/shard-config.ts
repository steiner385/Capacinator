/**
 * Test Sharding Configuration
 * Distributes tests across multiple shards for optimal parallelization
 */

export interface ShardConfig {
  name: string;
  testPattern: string | string[];
  weight: number; // Relative execution time weight
  priority: number; // Execution priority (lower = higher priority)
}

export const shardConfigs: ShardConfig[] = [
  // Shard 1: Quick tests (smoke, api)
  {
    name: 'quick',
    testPattern: [
      '**/smoke/**/*.spec.ts',
      '**/api/**/*.spec.ts',
    ],
    weight: 1,
    priority: 1,
  },

  // Shard 2: CRUD operations
  {
    name: 'crud',
    testPattern: '**/crud/**/*.spec.ts',
    weight: 2,
    priority: 2,
  },

  // Shard 3: Core functionality
  {
    name: 'core',
    testPattern: '**/core/**/*.spec.ts',
    weight: 2,
    priority: 2,
  },

  // Shard 4: Features (dashboard, import/export, phases)
  {
    name: 'features',
    testPattern: '**/features/**/*.spec.ts',
    weight: 3,
    priority: 3,
  },

  // Shard 5: Reports (heaviest)
  {
    name: 'reports-1',
    testPattern: [
      '**/reports/reports-comprehensive.spec.ts',
      '**/reports/advanced-features.spec.ts',
    ],
    weight: 4,
    priority: 4,
  },

  // Shard 6: Reports (continued)
  {
    name: 'reports-2',
    testPattern: [
      '**/reports/capacity-*.spec.ts',
      '**/reports/demand-*.spec.ts',
      '**/reports/utilization-*.spec.ts',
      '**/reports/gaps-*.spec.ts',
      '**/reports/navigation-*.spec.ts',
    ],
    weight: 3,
    priority: 4,
  },

  // Shard 7: Scenarios
  {
    name: 'scenarios',
    testPattern: '**/scenarios/**/*.spec.ts',
    weight: 4,
    priority: 5,
  },

  // Shard 8: Security & Integration
  {
    name: 'security-integration',
    testPattern: [
      '**/security/**/*.spec.ts',
      '**/integration/**/*.spec.ts',
    ],
    weight: 3,
    priority: 5,
  },

  // Shard 9: Tables & Other
  {
    name: 'tables-other',
    testPattern: [
      '**/tables/**/*.spec.ts',
      '**/*.spec.ts', // Catch-all for any remaining tests
    ],
    weight: 2,
    priority: 6,
  },
];

/**
 * Get shard configuration for CI/CD matrix strategy
 */
export function getShardMatrix() {
  return shardConfigs.map((shard, index) => ({
    shardIndex: index + 1,
    shardTotal: shardConfigs.length,
    shardName: shard.name,
    shardPattern: Array.isArray(shard.testPattern) 
      ? shard.testPattern.join(',') 
      : shard.testPattern,
  }));
}

/**
 * Get Playwright CLI arguments for a specific shard
 */
export function getShardArgs(shardIndex: number, totalShards: number): string[] {
  return [`--shard=${shardIndex}/${totalShards}`];
}

/**
 * Get test pattern for a specific shard
 */
export function getShardPattern(shardName: string): string | string[] {
  const shard = shardConfigs.find(s => s.name === shardName);
  return shard?.testPattern || '**/*.spec.ts';
}

/**
 * Calculate optimal worker count for a shard based on its weight
 */
export function getOptimalWorkerCount(shardName: string, baseWorkers: number = 4): number {
  const shard = shardConfigs.find(s => s.name === shardName);
  if (!shard) return baseWorkers;

  // Adjust workers based on weight
  if (shard.weight <= 1) return Math.max(2, Math.floor(baseWorkers * 0.5));
  if (shard.weight <= 2) return baseWorkers;
  if (shard.weight <= 3) return Math.ceil(baseWorkers * 1.25);
  return Math.ceil(baseWorkers * 1.5);
}