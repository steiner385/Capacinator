/**
 * Migration: Create sync_operations table for Git sync tracking
 * Feature: 001-git-sync-integration
 */

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sync_operations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
    table.enum('type', ['clone', 'pull', 'push', 'merge']).notNullable();
    table.enum('status', ['pending', 'in-progress', 'completed', 'failed', 'conflict']).notNullable().defaultTo('pending');
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
    table.integer('conflict_count').notNullable().defaultTo(0);
    table.text('error_message').nullable();
    table.uuid('user_id').nullable(); // References people table
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['status', 'started_at']);
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sync_operations');
}
