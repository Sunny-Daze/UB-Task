import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('products', 'stock_quantity', { default: 10 });
  pgm.sql('UPDATE products SET stock_quantity = 10');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('products', 'stock_quantity', { default: 5 });
  pgm.sql('UPDATE products SET stock_quantity = 5');
}
