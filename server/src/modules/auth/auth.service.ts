import bcrypt from 'bcrypt';
import { httpError } from '../../shared/httpError.js';
import { signJwt } from '../../shared/jwt.js';
import { userExists, findUserById, findUserByUsername, insertUser } from './auth.repository.js';
import type { LoginInput, SignupInput } from './auth.schema.js';
import type { SafeUser } from './auth.types.js';

export const signup = async (input: SignupInput): Promise<{ user: SafeUser; token: string }> => {
  try {
    const exists = await userExists(input.username);
    if (exists) {
      throw httpError(409, 'User already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const user = await insertUser({
      username: input.username,
      hashedPassword,
      role: input.role,
    });
    const token = signJwt({ id: user.id, role: user.role, username: user.username });

    return { user, token };
  } catch (error) {
    console.error('Error in signup:', { username: input.username, error });
    throw error;
  }
};

export const login = async (input: LoginInput): Promise<{ user: SafeUser; token: string }> => {
  try {
    const user = await findUserByUsername(input.username);
    if (!user) {
      throw httpError(401, 'Invalid credentials');
    }

    const match = await bcrypt.compare(input.password, user.password);
    if (!match) {
      throw httpError(401, 'Invalid credentials');
    }

    const { password: _password, ...safe } = user;
    const token = signJwt({ id: safe.id, role: safe.role, username: safe.username });

    return { user: safe, token };
  } catch (error) {
    console.error('Error in login:', { username: input.username, error });
    throw error;
  }
};

export const getMe = async (id: string): Promise<SafeUser> => {
  try {
    const user = await findUserById(id);
    if (!user) {
      throw httpError(401, 'Invalid credentials');
    }

    const { password: _password, ...safe } = user;

    return safe;
  } catch (error) {
    console.error('Error in getMe:', { id, error });
    throw error;
  }
};
