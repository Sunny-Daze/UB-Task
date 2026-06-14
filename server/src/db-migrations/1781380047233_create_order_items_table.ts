import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createExtension('uuid-ossp', { ifNotExists: true });

  pgm.createTable('order_items', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    order_id: {
      type: 'uuid',
      notNull: true,
      references: '"orders"',
      onDelete: 'CASCADE',
    },
    product_id: {
      type: 'uuid',
      notNull: true,
      references: '"products"',
      onDelete: 'CASCADE',
    },
    product_name: {
      type: 'varchar(250)',
      notNull: true,
    },
    unit_price: {
      type: 'numeric(10, 2)',
      notNull: true,
      check: 'unit_price >= 0',
    },
    quantity: {
      type: 'integer',
      notNull: true,
      check: 'quantity > 0',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('order_items', 'order_id');
  pgm.createIndex('order_items', 'product_id');

  // unique product per order
  pgm.addConstraint('order_items', 'order_items_order_product_unique', {
    unique: ['order_id', 'product_id'],
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('order_items');
}
