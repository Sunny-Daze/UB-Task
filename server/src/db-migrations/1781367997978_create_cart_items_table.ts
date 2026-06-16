import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('cart_items', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    cart_id: {
      type: 'uuid',
      notNull: true,
      references: '"carts"',
      onDelete: 'CASCADE',
    },
    product_id: {
      type: 'uuid',
      notNull: true,
      references: '"products"',
      onDelete: 'CASCADE',
    },
    quantity: {
      type: 'integer',
      notNull: true,
      default: 1,
      check: 'quantity > 0',
    },
  });

  // check for unique product per cart
  pgm.addConstraint('cart_items', 'cart_items_cart_product_unique', {
    unique: ['cart_id', 'product_id'],
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('cart_items');
}
