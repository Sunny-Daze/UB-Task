import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('carts', {
    applied_coupon_id: {
      type: 'uuid',
      references: 'coupons(id)',
      onDelete: 'SET NULL',
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('carts', ['applied_coupon_id']);
}
