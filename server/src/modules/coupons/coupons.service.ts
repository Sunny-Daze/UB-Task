import { CouponDiscountType, CouponStatus } from '../../constants/index.js';
import { roundTo } from '../../shared/math.js';
import { runCouponEngine } from './engine/runEngine.js';
import {
  expireOutdatedCouponsForUser,
  findActiveCouponsForUser,
  findAllIssuedCoupons,
  findCouponByCodeForUser,
  insertCouponConfiguration,
} from './coupons.repository.js';
import type {
  Coupon,
  CouponConfiguration,
  CouponWithConfig,
  DiscountCalculation,
  IssuedCouponView,
  ValidateCouponResult,
} from './coupons.types.js';
import type { CreateConfigInput } from './coupons.validation.js';

export const calculateDiscount = (
  config: CouponConfiguration,
  amount: number
): DiscountCalculation => {
  let discount: number;
  if (config.discount_type === CouponDiscountType.FLAT) {
    discount = Math.min(config.discount_value, amount);
  } else {
    discount = amount * (config.discount_value / 100);
    if (config.max_discount_amount !== null) {
      discount = Math.min(discount, config.max_discount_amount);
    }
  }

  const final = amount - discount;
  return {
    original_amount: roundTo(amount, 2),
    discount_amount: roundTo(discount, 2),
    final_amount: roundTo(final, 2),
  };
};

export const createConfiguration = async (
  input: CreateConfigInput
): Promise<CouponConfiguration> => {
  return insertCouponConfiguration(input);
};

export const listIssuedCoupons = async (): Promise<IssuedCouponView[]> => {
  return findAllIssuedCoupons();
};

export const issueCouponsForUserAfterOrder = (
  userId: string,
  newSuccessfulOrderCount: number
): Promise<Coupon[]> => {
  return runCouponEngine({ userId, newSuccessfulOrderCount });
};

export const listMyCoupons = async (userId: string): Promise<CouponWithConfig[]> => {
  await expireOutdatedCouponsForUser(userId);

  return findActiveCouponsForUser(userId);
};

export const validateCoupon = async (
  userId: string,
  code: string,
  orderAmount: number
): Promise<ValidateCouponResult> => {
  const coupon = await findCouponByCodeForUser(code, userId);
  if (!coupon) return { valid: false, reason: 'not_found' };

  if (coupon.assigned_user_id && coupon.assigned_user_id !== userId) {
    return { valid: false, reason: 'not_assigned_to_user' };
  }

  if (coupon.status !== CouponStatus.ACTIVE) {
    return { valid: false, reason: 'inactive' };
  }

  if (new Date(coupon.expires_at).getTime() < Date.now()) {
    return { valid: false, reason: 'expired' };
  }

  if (coupon.config.min_order_amount !== null && orderAmount < coupon.config.min_order_amount) {
    return { valid: false, reason: 'order_too_small' };
  }

  return {
    valid: true,
    coupon_id: coupon.id,
    discount: calculateDiscount(coupon.config, orderAmount),
  };
};
