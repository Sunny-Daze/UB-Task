import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createExtension('uuid-ossp', { ifNotExists: true });

  pgm.createTable('coupons', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    coupon_configuration_id: {
      type: 'uuid',
      notNull: true,
      references: 'coupon_configurations(id)',
      onDelete: 'CASCADE',
    },
    assigned_user_id: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    code: {
      type: 'varchar(50)',
      notNull: true,
      unique: true,
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'active',
      check: "status IN ('active', 'used', 'expired', 'cancelled')",
    },
    expires_at: {
      type: 'timestamp',
      notNull: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('coupons', 'assigned_user_id');
  pgm.createIndex('coupons', 'coupon_configuration_id');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('coupons');
}
