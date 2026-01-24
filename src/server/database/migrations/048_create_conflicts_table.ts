/**
 * Migration: Create conflicts table for merge conflict tracking
 * Feature: 001-git-sync-integration
 */

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('conflicts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
    table.uuid('sync_operation_id').notNullable();
    table.enum('entity_type', ['project', 'person', 'assignment', 'project_phase']).notNullable();
    table.uuid('entity_id').notNullable();
    table.string('entity_name', 255).notNullable(); // Human-readable name
    table.string('field', 100).notNullable(); // Conflicting field name
    table.text('base_value').nullable(); // JSON-encoded common ancestor value
    table.text('local_value').nullable(); // JSON-encoded user's value
    table.text('remote_value').nullable(); // JSON-encoded remote value
    table.enum('resolution_status', ['pending', 'resolved', 'deferred']).notNullable().defaultTo('pending');
    table.text('resolved_value').nullable(); // JSON-encoded user's chosen resolution
    table.timestamp('resolved_at').nullable();
    table.string('resolved_by', 255).nullable(); // User email who resolved
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Foreign key to sync_operations
    table.foreign('sync_operation_id').references('id').inTable('sync_operations').onDelete('CASCADE');

    // Indexes
    table.index(['sync_operation_id', 'resolution_status']);
    table.index(['entity_type', 'entity_id']);
    table.index('resolution_status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('conflicts');
}
