import db from '../../db/postgres.db.js';
import type { Product } from './products.types.js';

export const findAllProducts = async (): Promise<Product[]> => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, price::float AS price, description, category,
              image_uri, stock_quantity, created_at, updated_at
       FROM products
       ORDER BY created_at DESC`
    );

    return rows as Product[];
  } catch (err) {
    console.error('Error in findAllProducts:', { err });
    throw err;
  }
};
