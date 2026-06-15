export interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  category: string | null;
  image_uri: string | null;
  stock_quantity: number;
  created_at: Date;
  updated_at: Date;
}
