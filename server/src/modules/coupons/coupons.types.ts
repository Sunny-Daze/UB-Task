import type { CouponDiscountType, CouponStatus, CouponTriggerType } from '../../constants/index.js';

export interface CouponConfiguration {
  id: string;
  name: string;
  trigger_type: CouponTriggerType;
  trigger_value: number | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number | null;
  coupon_validity_days: number | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Coupon {
  id: string;
  coupon_configuration_id: string;
  assigned_user_id: string | null;
  code: string;
  status: CouponStatus;
  expires_at: Date;
  created_at: Date;
}

export interface CouponWithConfig extends Coupon {
  config: CouponConfiguration;
}

export interface DiscountCalculation {
  original_amount: number;
  discount_amount: number;
  final_amount: number;
}

export type ValidateCouponResult =
  | { valid: true; discount: DiscountCalculation; coupon_id: string }
  | { valid: false; reason: ValidateCouponFailReason };

export type ValidateCouponFailReason =
  | 'not_found'
  | 'not_assigned_to_user'
  | 'inactive'
  | 'expired'
  | 'order_too_small';

export interface IssuedCouponView {
  id: string;
  code: string;
  status: CouponStatus;
  expires_at: Date;
  created_at: Date;
  assigned_user_id: string | null;
  username: string | null;
  configuration_id: string;
  configuration_name: string;
  trigger_type: CouponTriggerType;
  discount_type: CouponDiscountType;
  discount_value: number;
}
