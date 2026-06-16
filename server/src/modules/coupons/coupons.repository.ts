import { CouponTriggerType } from '../../constants/index.js';
import db from '../../db/postgres.db.js';
import { isUniqueViolation } from '../../shared/pgErrors.js';
import { CouponCodeCollisionError } from './coupons.errors.js';
import type {
  Coupon,
  CouponConfiguration,
  CouponWithConfig,
  DiscountCodeUsage,
  IssuedCouponView,
  StatsOverview,
} from './coupons.types.js';
import type { CreateConfigInput } from './coupons.validation.js';

const REVENUE_STATUSES = ['pending', 'paid', 'confirmed'];

const CONFIG_COLS = `
  id, name, trigger_type, trigger_value, discount_type,
  discount_value::float AS discount_value,
  max_discount_amount::float AS max_discount_amount,
  min_order_amount::float AS min_order_amount,
  coupon_validity_days, active, created_at, updated_at
`;

const COUPON_COLS = `
  id, coupon_configuration_id, assigned_user_id, code, status, expires_at, created_at
`;

export const insertCouponConfiguration = async (
  input: CreateConfigInput
): Promise<CouponConfiguration> => {
  try {
    const { rows } = await db.query(
      `INSERT INTO coupon_configurations
         (name, trigger_type, trigger_value, discount_type, discount_value,
          max_discount_amount, min_order_amount, coupon_validity_days, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${CONFIG_COLS}`,
      [
        input.name,
        input.trigger_type,
        input.trigger_value ?? null,
        input.discount_type,
        input.discount_value,
        input.max_discount_amount ?? null,
        input.min_order_amount ?? null,
        input.coupon_validity_days ?? null,
        input.active ?? true,
      ]
    );

    return rows[0] as CouponConfiguration;
  } catch (err) {
    console.error('Error in insertCouponConfiguration:', { input, err });
    throw err;
  }
};

export const findActiveTriggerableConfigurations = async (): Promise<CouponConfiguration[]> => {
  try {
    const { rows } = await db.query(
      `SELECT ${CONFIG_COLS} FROM coupon_configurations
       WHERE active = true AND trigger_type != $1`,
      [CouponTriggerType.MANUAL]
    );

    return rows as CouponConfiguration[];
  } catch (err) {
    console.error('Error in findActiveTriggerableConfigurations:', { err });
    throw err;
  }
};

export const insertCoupon = async (input: {
  configId: string;
  userId: string;
  code: string;
  expiresAt: Date;
}): Promise<Coupon> => {
  try {
    const { rows } = await db.query(
      `INSERT INTO coupons (coupon_configuration_id, assigned_user_id, code, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COUPON_COLS}`,
      [input.configId, input.userId, input.code, input.expiresAt]
    );

    return rows[0] as Coupon;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new CouponCodeCollisionError(input.code);
    }
    console.error('Error in insertCoupon:', { input, err });
    throw err;
  }
};

export const findCouponByCodeForUser = async (
  code: string,
  userId: string
): Promise<CouponWithConfig | null> => {
  try {
    const { rows } = await db.query(
      `SELECT
         c.id, c.coupon_configuration_id, c.assigned_user_id, c.code, c.status,
         c.expires_at, c.created_at,
         cc.id AS cc_id, cc.name AS cc_name, cc.trigger_type, cc.trigger_value,
         cc.discount_type,
         cc.discount_value::float AS discount_value,
         cc.max_discount_amount::float AS max_discount_amount,
         cc.min_order_amount::float AS min_order_amount,
         cc.coupon_validity_days, cc.active, cc.created_at AS cc_created_at,
         cc.updated_at AS cc_updated_at
       FROM coupons c
       JOIN coupon_configurations cc ON cc.id = c.coupon_configuration_id
       WHERE c.code = $1 AND (c.assigned_user_id = $2 OR c.assigned_user_id IS NULL)`,
      [code, userId]
    );

    if (rows.length === 0) return null;

    const r = rows[0];
    return {
      id: r.id,
      coupon_configuration_id: r.coupon_configuration_id,
      assigned_user_id: r.assigned_user_id,
      code: r.code,
      status: r.status,
      expires_at: r.expires_at,
      created_at: r.created_at,
      config: {
        id: r.cc_id,
        name: r.cc_name,
        trigger_type: r.trigger_type,
        trigger_value: r.trigger_value,
        discount_type: r.discount_type,
        discount_value: r.discount_value,
        max_discount_amount: r.max_discount_amount,
        min_order_amount: r.min_order_amount,
        coupon_validity_days: r.coupon_validity_days,
        active: r.active,
        created_at: r.cc_created_at,
        updated_at: r.cc_updated_at,
      },
    };
  } catch (err) {
    console.error('Error in findCouponByCodeForUser:', { code, userId, err });
    throw err;
  }
};

export const expireOutdatedCouponsForUser = async (userId: string): Promise<void> => {
  try {
    await db.query(
      `UPDATE coupons SET status = 'expired'
       WHERE assigned_user_id = $1 AND status = 'active' AND expires_at < now()`,
      [userId]
    );
  } catch (err) {
    console.error('Error in expireOutdatedCouponsForUser:', { userId, err });
    throw err;
  }
};

export const findActiveCouponsForUser = async (userId: string): Promise<CouponWithConfig[]> => {
  try {
    const { rows } = await db.query(
      `SELECT
         c.id, c.coupon_configuration_id, c.assigned_user_id, c.code, c.status,
         c.expires_at, c.created_at,
         cc.id AS cc_id, cc.name AS cc_name, cc.trigger_type, cc.trigger_value,
         cc.discount_type,
         cc.discount_value::float AS discount_value,
         cc.max_discount_amount::float AS max_discount_amount,
         cc.min_order_amount::float AS min_order_amount,
         cc.coupon_validity_days, cc.active, cc.created_at AS cc_created_at,
         cc.updated_at AS cc_updated_at
       FROM coupons c
       JOIN coupon_configurations cc ON cc.id = c.coupon_configuration_id
       WHERE c.assigned_user_id = $1 AND c.status = 'active' AND c.expires_at > now()
       ORDER BY c.created_at DESC`,
      [userId]
    );

    return rows.map((r) => ({
      id: r.id,
      coupon_configuration_id: r.coupon_configuration_id,
      assigned_user_id: r.assigned_user_id,
      code: r.code,
      status: r.status,
      expires_at: r.expires_at,
      created_at: r.created_at,
      config: {
        id: r.cc_id,
        name: r.cc_name,
        trigger_type: r.trigger_type,
        trigger_value: r.trigger_value,
        discount_type: r.discount_type,
        discount_value: r.discount_value,
        max_discount_amount: r.max_discount_amount,
        min_order_amount: r.min_order_amount,
        coupon_validity_days: r.coupon_validity_days,
        active: r.active,
        created_at: r.cc_created_at,
        updated_at: r.cc_updated_at,
      },
    }));
  } catch (err) {
    console.error('Error in findActiveCouponsForUser:', { userId, err });
    throw err;
  }
};

export const findAllIssuedCoupons = async (): Promise<IssuedCouponView[]> => {
  try {
    const { rows } = await db.query(
      `SELECT
         c.id, c.code, c.status, c.expires_at, c.created_at, c.assigned_user_id,
         u.username,
         cc.id AS configuration_id, cc.name AS configuration_name,
         cc.trigger_type, cc.discount_type,
         cc.discount_value::float AS discount_value
       FROM coupons c
       JOIN coupon_configurations cc ON cc.id = c.coupon_configuration_id
       LEFT JOIN users u ON u.id = c.assigned_user_id
       ORDER BY c.created_at DESC`
    );

    return rows as IssuedCouponView[];
  } catch (err) {
    console.error('Error in findAllIssuedCoupons:', { err });
    throw err;
  }
};

export const findStatsOverview = async (): Promise<StatsOverview> => {
  const { rows: orderRows } = await db.query(
    `SELECT
       COUNT(DISTINCT o.id)::int          AS total_orders,
       COALESCE(SUM(oi.quantity), 0)::int AS items_purchased,
       COALESCE(SUM(o.total), 0)::float   AS revenue
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.status = ANY($1::text[])`,
    [REVENUE_STATUSES]
  );

  const { rows: discountRows } = await db.query(
    `SELECT
       COALESCE(SUM(cu.discount_amount), 0)::float AS total_discount,
       COUNT(*)::int                                AS coupons_used
     FROM coupon_usage cu
     JOIN orders o ON o.id = cu.order_id
     WHERE o.status = ANY($1::text[])`,
    [REVENUE_STATUSES]
  );

  return {
    total_orders: orderRows[0].total_orders ?? 0,
    items_purchased: orderRows[0].items_purchased ?? 0,
    revenue: orderRows[0].revenue ?? 0,
    total_discount: discountRows[0].total_discount ?? 0,
    coupons_used: discountRows[0].coupons_used ?? 0,
  };
};

export const findDiscountCodesUsage = async (): Promise<DiscountCodeUsage[]> => {
  const { rows } = await db.query(
    `SELECT
       c.id                                AS coupon_id,
       c.code                              AS code,
       cc.name                             AS configuration_name,
       COUNT(cu.id)::int                   AS times_used,
       COALESCE(SUM(cu.discount_amount), 0)::float AS total_discount
     FROM coupon_usage cu
     JOIN coupons c              ON c.id  = cu.coupon_id
     JOIN coupon_configurations cc ON cc.id = c.coupon_configuration_id
     JOIN orders o               ON o.id  = cu.order_id
     WHERE o.status = ANY($1::text[])
     GROUP BY c.id, c.code, cc.name
     ORDER BY total_discount DESC, times_used DESC`,
    [REVENUE_STATUSES]
  );

  return rows as DiscountCodeUsage[];
};
