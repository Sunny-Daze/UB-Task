import { randomInt } from 'crypto';
import { httpError } from '../../../shared/httpError.js';
import { CouponCodeCollisionError } from '../coupons.errors.js';
import { insertCoupon } from '../coupons.repository.js';
import type { Coupon, CouponConfiguration } from '../coupons.types.js';

const CODE_BANK = '123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 10;
const MAX_CODE_RETRIES = 5;
const DEFAULT_VALIDITY_DAYS = 30;

const generateCouponCode = (): string => {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_BANK[randomInt(0, CODE_BANK.length)];
  }
  return code;
};

const computeExpiresAt = (validityDays: number | null): Date => {
  const days = validityDays ?? DEFAULT_VALIDITY_DAYS;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

export const issueCouponForConfig = async (
  config: CouponConfiguration,
  userId: string
): Promise<Coupon> => {
  const expiresAt = computeExpiresAt(config.coupon_validity_days);
  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const code = generateCouponCode();
    try {
      return await insertCoupon({ configId: config.id, userId, code, expiresAt });
    } catch (err) {
      if (err instanceof CouponCodeCollisionError) continue;
      throw err;
    }
  }

  throw httpError(500, 'Failed to generate coupon code');
};
