import { Knex } from 'knex';

declare global {
  var __E2E_DB__: Knex | undefined;
}

export {};