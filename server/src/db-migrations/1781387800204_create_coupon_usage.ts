import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createExtension('uuid-ossp', { ifNotExists: true });

  pgm.createTable('coupon_usage', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    coupon_id: {
      type: 'uuid',
      notNull: true,
      references: 'coupons(id)',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    order_id: {
      type: 'uuid',
      notNull: true,
      references: 'orders(id)',
      onDelete: 'CASCADE',
    },
    original_amount: {
      type: 'numeric(10,2)',
      notNull: true,
      check: 'original_amount >= 0',
    },
    discount_amount: {
      type: 'numeric(10,2)',
      notNull: true,
      check: 'discount_amount >= 0',
    },
    final_amount: {
      type: 'numeric(10,2)',
      notNull: true,
      check: 'final_amount >= 0',
    },
    used_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.addConstraint('coupon_usage', 'coupon_usage_amounts_valid', {
    check:
      'discount_amount <= original_amount AND final_amount = original_amount - discount_amount',
  });

  pgm.createIndex('coupon_usage', 'coupon_id');
  pgm.createIndex('coupon_usage', 'user_id');
  pgm.createIndex('coupon_usage', 'order_id');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('coupon_usage');
}
