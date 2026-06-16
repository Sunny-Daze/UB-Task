export const UserRole = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const CouponTriggerType = {
  NTH_ORDER: 'nth_order',
  FIRST_TIME: 'first_time',
  MANUAL: 'manual',
} as const;

export type CouponTriggerType = (typeof CouponTriggerType)[keyof typeof CouponTriggerType];

export const CouponDiscountType = {
  PERCENTAGE: 'percentage',
  FLAT: 'flat',
} as const;

export type CouponDiscountType = (typeof CouponDiscountType)[keyof typeof CouponDiscountType];

export const CouponStatus = {
  ACTIVE: 'active',
  USED: 'used',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export type CouponStatus = (typeof CouponStatus)[keyof typeof CouponStatus];
