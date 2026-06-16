export class CouponCodeCollisionError extends Error {
  constructor(public code: string) {
    super(`Coupon code collision: ${code}`);
    this.name = 'CouponCodeCollisionError';
  }
}
