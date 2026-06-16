import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('products', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(250)',
      notNull: true,
    },
    price: {
      type: 'numeric(10, 2)',
      notNull: true,
      check: 'price >= 0',
    },
    description: {
      type: 'text',
    },
    category: {
      type: 'varchar(100)',
    },
    image_uri: {
      type: 'text',
    },
    stock_quantity: {
      type: 'integer',
      notNull: true,
      default: 5, // for demo purpose this is set to 5
      check: 'stock_quantity >= 0',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('products');
}
