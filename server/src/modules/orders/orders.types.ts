export type OrderStatus = 'pending' | 'paid' | 'confirmed' | 'cancelled' | 'failed' | 'refunded';

export interface OrderItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  image_uri: string | null;
  line_total: number;
}

export interface AppliedCouponOnOrder {
  coupon_id: string;
  code: string;
  discount_amount: number;
}

export interface OrderView {
  id: string;
  user_id: string;
  subtotal: number;
  total: number;
  status: OrderStatus;
  items: OrderItem[];
  applied_coupon: AppliedCouponOnOrder | null;
  created_at: Date;
}

export interface OrderSummary {
  id: string;
  subtotal: number;
  total: number;
  status: OrderStatus;
  item_count: number;
  created_at: Date;
}

export interface IssuedCouponSummary {
  id: string;
  code: string;
  expires_at: Date;
  configuration_name: string;
}

export interface PlaceOrderResult {
  order: OrderView;
  issued_coupons: IssuedCouponSummary[];
}
