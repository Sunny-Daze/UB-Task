import type { UserRole } from '../../constants/index.js';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  successful_order_count: number;
  created_at: Date;
}

export type SafeUser = Omit<User, 'password'>;
