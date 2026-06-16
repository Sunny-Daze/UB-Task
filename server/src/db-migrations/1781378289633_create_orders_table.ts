import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('orders', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    cart_id: {
      type: 'uuid',
      references: '"carts"',
      onDelete: 'CASCADE',
    },
    subtotal: {
      type: 'numeric(10, 2)',
      notNull: true,
      check: 'subtotal >= 0',
    },
    total: {
      type: 'numeric(10, 2)',
      notNull: true,
      check: 'total >= 0',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'pending',
      check: "status IN ('pending', 'paid', 'confirmed', 'cancelled', 'failed', 'refunded')",
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
    coupon_id: {
      type: 'uuid',
      references: '"coupons"',
      onDelete: 'SET NULL',
    },
  });

  pgm.createIndex('orders', 'user_id');
  pgm.createIndex('orders', 'created_at');
  pgm.createIndex('orders', 'coupon_id'); // Added index for coupon lookups
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('orders');
}
