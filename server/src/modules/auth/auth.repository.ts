import type { UserRole } from '../../constants/index.js';
import db from '../../db/postgres.db.js';
import type { SafeUser, User } from './auth.types.js';

export const insertUser = async ({
  username,
  hashedPassword,
  role,
}: {
  username: string;
  hashedPassword: string;
  role: UserRole;
}): Promise<SafeUser> => {
  try {
    const { rows } = await db.query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, $3)
       RETURNING id, username, role, successful_order_count, created_at`,
      [username, hashedPassword, role]
    );

    return rows[0] as SafeUser;
  } catch (err) {
    console.error('Error in insertUser:', { username, role, err });
    throw err;
  }
};

export const userExists = async (username: string): Promise<boolean> => {
  try {
    const { rows } = await db.query(`SELECT 1 FROM users WHERE username = $1`, [username]);

    return rows?.length > 0;
  } catch (err) {
    console.error('Error in userExists:', { username, err });
    throw err;
  }
};

export const findUserById = async (id: string): Promise<User | null> => {
  try {
    const { rows } = await db.query(
      `SELECT id, username, password, role, successful_order_count, created_at
       FROM users WHERE id = $1`,
      [id]
    );

    return rows[0] ?? null;
  } catch (err) {
    console.error('Error in findUserById:', { id, err });
    throw err;
  }
};

export const findUserByUsername = async (username: string): Promise<User | null> => {
  try {
    const { rows } = await db.query(
      `SELECT id, username, password, role, successful_order_count, created_at
       FROM users WHERE username = $1`,
      [username]
    );

    return rows[0] ?? null;
  } catch (err) {
    console.error('Error in findUserByUsername:', { username, err });
    throw err;
  }
};
