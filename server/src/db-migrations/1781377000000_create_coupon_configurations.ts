import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('coupon_configurations', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    trigger_type: {
      type: 'varchar(50)',
      notNull: true,
    },
    trigger_value: {
      type: 'integer',
    },
    discount_type: {
      type: 'varchar(20)',
      notNull: true,
    },
    discount_value: {
      type: 'numeric(10,2)',
      notNull: true,
      check: 'discount_value > 0',
    },
    max_discount_amount: {
      type: 'numeric(10,2)',
      check: 'max_discount_amount >= 0',
    },
    min_order_amount: {
      type: 'numeric(10,2)',
      check: 'min_order_amount >= 0',
    },
    coupon_validity_days: {
      type: 'integer',
      check: 'coupon_validity_days > 0',
    },
    active: {
      type: 'boolean',
      notNull: true,
      default: true,
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
  pgm.dropTable('coupon_configurations');
}
