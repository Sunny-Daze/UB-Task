import { findAllProducts } from './products.repository.js';
import type { Product } from './products.types.js';

export const getAllProducts = async (): Promise<Product[]> => {
  return findAllProducts();
};
