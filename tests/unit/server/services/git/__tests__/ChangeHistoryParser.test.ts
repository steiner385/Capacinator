/**
 * ChangeHistoryParser Unit Tests
 * Feature: 001-git-sync-integration
 * Issue: #107 - Git Sync Unit Tests - Tier 3 Supporting Services
 *
 * Tests for ChangeHistoryParser covering:
 * - Commit message parsing
 * - Entity type normalization
 * - Change history filtering
 * - Change formatting and grouping
 * - Summary statistics
 *
 * Coverage target: 85% statements, 80% branches
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { ChangeHistoryParser, EntityChange } from '../../../../../../src/server/services/git/ChangeHistoryParser.js';
import type { Knex } from 'knex';

// ===========================================
// Mock Database
// ===========================================

const mockDb = {} as Knex;

// ===========================================
// Test Helpers
// ===========================================

interface CommitInfo {
  hash: string;
  date: string;
  message: string;
  author_name: string;
  author_email: string;
}

function createTestCommit(overrides: Partial<CommitInfo> = {}): CommitInfo {
  return {
    hash: 'abc123def456',
    date: '2024-01-15T10:30:00.000Z',
    message: 'Updated scenario data',
    author_name: 'Test User',
    author_email: 'test@example.com',
    ...overrides,
  };
}

function createTestChange(overrides: Partial<EntityChange> = {}): EntityChange {
  return {
    entityType: 'project',
    entityId: 'proj-123',
    entityName: 'Test Project',
    changeType: 'updated',
    timestamp: '2024-01-15T10:30:00.000Z',
    author: 'Test User',
    commitHash: 'abc123def456',
    commitMessage: 'Updated scenario data',
    ...overrides,
  };
}

// ===========================================
// Tests
// ===========================================

describe('ChangeHistoryParser', () => {
  let parser: ChangeHistoryParser;

  beforeEach(() => {
    parser = new ChangeHistoryParser(mockDb);
  });

  describe('parseCommitHistory', () => {
    test('should return empty array for no commits', async () => {
      const result = await parser.parseCommitHistory([]);

      expect(result).toEqual([]);
    });

    test('should parse project count from commit message', async () => {
      const commits = [
        createTestCommit({ message: 'Updated scenario data: 5 projects modified' }),
      ];

      const result = await parser.parseCommitHistory(commits);

      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe('project');
      expect(result[0].entityName).toContain('5');
    });

    test('should parse people count from commit message', async () => {
      const commits = [
        createTestCommit({ message: 'Sync: 10 people updated' }),
      ];

      const result = await parser.parseCommitHistory(commits);

      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe('person');
    });

    test('should parse person count from commit message', async () => {
      const commits = [
        createTestCommit({ message: 'Added 1 person' }),
      ];

      const result = await parser.parseCommitHistory(commits);

      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe('person');
    });

    test('should parse assignment count from commit message', async () => {
      const commits = [
        createTestCommit({ message: 'Created 15 assignments' }),
      ];

      const result = await parser.parseCommitHistory(commits);

      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe('assignment');
    });

    test('should parse phase count from commit message', async () => {
      const commits = [
        createTestCommit({ message: 'Updated 3 phases' }),
      ];

      const result = await parser.parseCommitHistory(commits);

      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe('project_phase');
    });

    test('should parse multiple entity types from single commit', async () => {
      const commits = [
        createTestCommit({ message: 'Sync: 5 projects, 10 people, 20 assignments' }),
      ];

      const result = await parser.parseCommitHistory(commits);

      expect(result).toHaveLength(3);
      expect(result.map(r => r.entityType)).toContain('project');
      expect(result.map(r => r.entityType)).toContain('person');
      expect(result.map(r => r.entityType)).toContain('assignment');
    });

    test('should parse multiple commits', async () => {
      const commits = [
        createTestCommit({ hash: 'commit1', message: '5 projects updated' }),
        createTestCommit({ hash: 'commit2', message: '3 people added' }),
      ];

      const result = await parser.parseCommitHistory(commits);

      expect(result).toHaveLength(2);
      expect(result[0].commitHash).toBe('commit1');
      expect(result[1].commitHash).toBe('commit2');
    });

    test('should preserve commit metadata in changes', async () => {
      const commits = [
        createTestCommit({
          hash: 'def789',
          date: '2024-02-20T15:00:00.000Z',
          message: '1 project updated',
          author_name: 'Jane Doe',
        }),
      ];

      const result = await parser.parseCommitHistory(commits);

      expect(result[0].commitHash).toBe('def789');
      expect(result[0].timestamp).toBe('2024-02-20T15:00:00.000Z');
      expect(result[0].author).toBe('Jane Doe');
      expect(result[0].commitMessage).toBe('1 project updated');
    });

    test('should return empty array for commit without entity patterns', async () => {
      const commits = [
        createTestCommit({ message: 'Refactored code' }),
      ];

      const result = await parser.parseCommitHistory(commits);

      expect(result).toEqual([]);
    });

    test('should handle case-insensitive matching', async () => {
      const commits = [
        createTestCommit({ message: '5 PROJECTS, 3 PEOPLE' }),
      ];

      const result = await parser.parseCommitHistory(commits);

      expect(result).toHaveLength(2);
    });

    test('should set changeType to updated for parsed messages', async () => {
      const commits = [
        createTestCommit({ message: '5 projects' }),
      ];

      const result = await parser.parseCommitHistory(commits);

      expect(result[0].changeType).toBe('updated');
    });

    test('should set entityId to bulk for batch operations', async () => {
      const commits = [
        createTestCommit({ message: '5 projects' }),
      ];

      const result = await parser.parseCommitHistory(commits);

      expect(result[0].entityId).toBe('bulk');
    });
  });

  describe('getEntityHistory', () => {
    test('should filter changes by entity type and ID', async () => {
      // This test relies on the parseCommitHistory behavior
      const commits = [
        createTestCommit({ message: '5 projects' }),
      ];

      // Since bulk operations use entityId='bulk', filter for that
      const result = await parser.getEntityHistory('project', 'bulk', commits);

      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe('project');
    });

    test('should return empty array when no matches', async () => {
      const commits = [
        createTestCommit({ message: '5 projects' }),
      ];

      // Looking for specific entity ID that doesn't exist
      const result = await parser.getEntityHistory('project', 'specific-id', commits);

      expect(result).toEqual([]);
    });

    test('should filter by entity type', async () => {
      const commits = [
        createTestCommit({ message: '5 projects, 3 people' }),
      ];

      const result = await parser.getEntityHistory('project', 'bulk', commits);

      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe('project');
    });

    test('should return empty for mismatched type', async () => {
      const commits = [
        createTestCommit({ message: '5 projects' }),
      ];

      const result = await parser.getEntityHistory('person', 'bulk', commits);

      expect(result).toEqual([]);
    });
  });

  describe('getCommitEntityDiff', () => {
    test('should return empty array (placeholder implementation)', async () => {
      const result = await parser.getCommitEntityDiff('abc123', 'project', 'proj-1');

      expect(result).toEqual([]);
    });
  });

  describe('formatChange', () => {
    test('should format created change', () => {
      const change = createTestChange({ changeType: 'created' });

      const result = parser.formatChange(change);

      expect(result).toBe('Created Test Project');
    });

    test('should format deleted change', () => {
      const change = createTestChange({ changeType: 'deleted' });

      const result = parser.formatChange(change);

      expect(result).toBe('Deleted Test Project');
    });

    test('should format updated change without field', () => {
      const change = createTestChange({ changeType: 'updated' });

      const result = parser.formatChange(change);

      expect(result).toBe('Updated Test Project');
    });

    test('should format updated change with field details', () => {
      const change = createTestChange({
        changeType: 'updated',
        field: 'name',
        oldValue: 'Old Name',
        newValue: 'New Name',
      });

      const result = parser.formatChange(change);

      expect(result).toBe('Updated Test Project: name changed from "Old Name" to "New Name"');
    });

    test('should handle numeric values in field changes', () => {
      const change = createTestChange({
        changeType: 'updated',
        field: 'allocation',
        oldValue: 50,
        newValue: 75,
      });

      const result = parser.formatChange(change);

      expect(result).toContain('allocation');
      expect(result).toContain('50');
      expect(result).toContain('75');
    });

    test('should handle null/undefined old values', () => {
      const change = createTestChange({
        changeType: 'updated',
        field: 'description',
        oldValue: undefined,
        newValue: 'New description',
      });

      const result = parser.formatChange(change);

      expect(result).toContain('description');
      expect(result).toContain('undefined');
      expect(result).toContain('New description');
    });
  });

  describe('groupByEntity', () => {
    test('should return empty map for no changes', () => {
      const result = parser.groupByEntity([]);

      expect(result.size).toBe(0);
    });

    test('should group changes by entity key', () => {
      const changes = [
        createTestChange({ entityType: 'project', entityId: 'proj-1' }),
        createTestChange({ entityType: 'project', entityId: 'proj-1' }),
        createTestChange({ entityType: 'project', entityId: 'proj-2' }),
      ];

      const result = parser.groupByEntity(changes);

      expect(result.size).toBe(2);
      expect(result.get('project:proj-1')).toHaveLength(2);
      expect(result.get('project:proj-2')).toHaveLength(1);
    });

    test('should separate different entity types', () => {
      const changes = [
        createTestChange({ entityType: 'project', entityId: '1' }),
        createTestChange({ entityType: 'person', entityId: '1' }),
      ];

      const result = parser.groupByEntity(changes);

      expect(result.size).toBe(2);
      expect(result.has('project:1')).toBe(true);
      expect(result.has('person:1')).toBe(true);
    });

    test('should preserve all changes in groups', () => {
      const change1 = createTestChange({ entityType: 'project', entityId: 'proj-1', changeType: 'created' });
      const change2 = createTestChange({ entityType: 'project', entityId: 'proj-1', changeType: 'updated' });
      const changes = [change1, change2];

      const result = parser.groupByEntity(changes);
      const group = result.get('project:proj-1')!;

      expect(group).toHaveLength(2);
      expect(group[0].changeType).toBe('created');
      expect(group[1].changeType).toBe('updated');
    });
  });

  describe('getChangeSummary', () => {
    test('should return zero counts for empty changes', () => {
      const result = parser.getChangeSummary([]);

      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.deleted).toBe(0);
      expect(Object.keys(result.byType)).toHaveLength(0);
    });

    test('should count created changes', () => {
      const changes = [
        createTestChange({ changeType: 'created' }),
        createTestChange({ changeType: 'created' }),
      ];

      const result = parser.getChangeSummary(changes);

      expect(result.created).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.deleted).toBe(0);
    });

    test('should count updated changes', () => {
      const changes = [
        createTestChange({ changeType: 'updated' }),
        createTestChange({ changeType: 'updated' }),
        createTestChange({ changeType: 'updated' }),
      ];

      const result = parser.getChangeSummary(changes);

      expect(result.updated).toBe(3);
    });

    test('should count deleted changes', () => {
      const changes = [
        createTestChange({ changeType: 'deleted' }),
      ];

      const result = parser.getChangeSummary(changes);

      expect(result.deleted).toBe(1);
    });

    test('should count all change types together', () => {
      const changes = [
        createTestChange({ changeType: 'created' }),
        createTestChange({ changeType: 'updated' }),
        createTestChange({ changeType: 'updated' }),
        createTestChange({ changeType: 'deleted' }),
      ];

      const result = parser.getChangeSummary(changes);

      expect(result.created).toBe(1);
      expect(result.updated).toBe(2);
      expect(result.deleted).toBe(1);
    });

    test('should count changes by entity type', () => {
      const changes = [
        createTestChange({ entityType: 'project' }),
        createTestChange({ entityType: 'project' }),
        createTestChange({ entityType: 'person' }),
        createTestChange({ entityType: 'assignment' }),
      ];

      const result = parser.getChangeSummary(changes);

      expect(result.byType.project).toBe(2);
      expect(result.byType.person).toBe(1);
      expect(result.byType.assignment).toBe(1);
    });

    test('should handle project_phase entity type', () => {
      const changes = [
        createTestChange({ entityType: 'project_phase' }),
        createTestChange({ entityType: 'project_phase' }),
      ];

      const result = parser.getChangeSummary(changes);

      expect(result.byType.project_phase).toBe(2);
    });
  });

  describe('normalizeEntityType (via parseCommitHistory)', () => {
    test('should normalize project_phase from phase keyword', async () => {
      const commits = [createTestCommit({ message: '5 phases' })];
      const result = await parser.parseCommitHistory(commits);

      expect(result[0].entityType).toBe('project_phase');
    });

    test('should normalize project from project keyword', async () => {
      const commits = [createTestCommit({ message: '3 projects' })];
      const result = await parser.parseCommitHistory(commits);

      expect(result[0].entityType).toBe('project');
    });

    test('should normalize person from people keyword', async () => {
      const commits = [createTestCommit({ message: '2 people' })];
      const result = await parser.parseCommitHistory(commits);

      expect(result[0].entityType).toBe('person');
    });

    test('should normalize person from person keyword', async () => {
      const commits = [createTestCommit({ message: '1 person' })];
      const result = await parser.parseCommitHistory(commits);

      expect(result[0].entityType).toBe('person');
    });

    test('should normalize assignment from assignment keyword', async () => {
      const commits = [createTestCommit({ message: '10 assignments' })];
      const result = await parser.parseCommitHistory(commits);

      expect(result[0].entityType).toBe('assignment');
    });

    test('should handle project_phase over project keyword priority', async () => {
      // "project_phases" contains "project" but should be matched as project_phase
      const commits = [createTestCommit({ message: '2 phases' })];
      const result = await parser.parseCommitHistory(commits);

      expect(result[0].entityType).toBe('project_phase');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty commit message', async () => {
      const commits = [createTestCommit({ message: '' })];
      const result = await parser.parseCommitHistory(commits);

      expect(result).toEqual([]);
    });

    test('should handle commit message with only numbers', async () => {
      const commits = [createTestCommit({ message: '123 456 789' })];
      const result = await parser.parseCommitHistory(commits);

      expect(result).toEqual([]);
    });

    test('should handle very large numbers in commit message', async () => {
      const commits = [createTestCommit({ message: '99999 projects' })];
      const result = await parser.parseCommitHistory(commits);

      expect(result[0].entityName).toContain('99999');
    });

    test('should handle special characters in commit message', async () => {
      const commits = [createTestCommit({ message: 'Updated: 5 projects! @#$%' })];
      const result = await parser.parseCommitHistory(commits);

      expect(result).toHaveLength(1);
    });

    test('should handle unicode characters in author name', async () => {
      const commits = [createTestCommit({
        message: '3 projects',
        author_name: '日本語 Author ñ',
      })];
      const result = await parser.parseCommitHistory(commits);

      expect(result[0].author).toBe('日本語 Author ñ');
    });

    test('should handle very long commit message', async () => {
      const longMessage = '5 projects ' + 'x'.repeat(10000);
      const commits = [createTestCommit({ message: longMessage })];
      const result = await parser.parseCommitHistory(commits);

      expect(result).toHaveLength(1);
    });

    test('should handle ISO date format', async () => {
      const commits = [createTestCommit({
        message: '1 project',
        date: '2024-12-31T23:59:59.999Z',
      })];
      const result = await parser.parseCommitHistory(commits);

      expect(result[0].timestamp).toBe('2024-12-31T23:59:59.999Z');
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle full workflow: parse, group, summarize', async () => {
      const commits = [
        createTestCommit({ hash: 'c1', message: '5 projects, 3 people' }),
        createTestCommit({ hash: 'c2', message: '2 assignments' }),
      ];

      // Parse
      const changes = await parser.parseCommitHistory(commits);
      expect(changes).toHaveLength(3);

      // Group
      const grouped = parser.groupByEntity(changes);
      expect(grouped.size).toBe(3); // project:bulk, person:bulk, assignment:bulk

      // Summarize
      const summary = parser.getChangeSummary(changes);
      expect(summary.updated).toBe(3);
      expect(summary.byType.project).toBe(1);
      expect(summary.byType.person).toBe(1);
      expect(summary.byType.assignment).toBe(1);
    });

    test('should handle format multiple changes', () => {
      const changes = [
        createTestChange({ entityName: 'Project A', changeType: 'created' }),
        createTestChange({ entityName: 'Project B', changeType: 'deleted' }),
        createTestChange({
          entityName: 'Project C',
          changeType: 'updated',
          field: 'status',
          oldValue: 'draft',
          newValue: 'active',
        }),
      ];

      const formatted = changes.map(c => parser.formatChange(c));

      expect(formatted[0]).toBe('Created Project A');
      expect(formatted[1]).toBe('Deleted Project B');
      expect(formatted[2]).toContain('status changed');
    });
  });
});
