import db from '../../db/postgres.db.js';
import type { OrderSummary } from './orders.types.js';

export const findOrdersForUser = async (userId: string): Promise<OrderSummary[]> => {
  try {
    const { rows } = await db.query(
      `SELECT
         o.id,
         o.subtotal::float AS subtotal,
         o.total::float AS total,
         o.status,
         o.created_at,
         COALESCE(SUM(oi.quantity), 0)::int AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    );

    return rows as OrderSummary[];
  } catch (err) {
    console.error('Error in findOrdersForUser:', { userId, err });
    throw err;
  }
};
