import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UserRole } from '../../constants/index.js';
import { AppError } from '../../shared/httpError.js';
import type { SafeUser, User } from './auth.types.js';

const userExists = jest.fn<(username: string) => Promise<boolean>>();
const insertUser = jest.fn<() => Promise<SafeUser>>();
const findUserByUsername = jest.fn<(username: string) => Promise<User | null>>();
const findUserById = jest.fn<(id: string) => Promise<User | null>>();
const hash = jest.fn<(data: string, rounds: number) => Promise<string>>();
const compare = jest.fn<(data: string, encrypted: string) => Promise<boolean>>();
const signJwt = jest.fn<() => string>();

jest.unstable_mockModule('./auth.repository.js', () => ({
  userExists,
  insertUser,
  findUserByUsername,
  findUserById,
}));
jest.unstable_mockModule('bcrypt', () => ({ default: { hash, compare } }));
jest.unstable_mockModule('../../shared/jwt.js', () => ({ signJwt }));

const { signup, login, getMe } = await import('./auth.service.js');

const safeUser: SafeUser = {
  id: 'user-1',
  username: 'alice',
  role: UserRole.USER,
  successful_order_count: 0,
  created_at: new Date('2024-01-01T00:00:00Z'),
};

const fullUser: User = { ...safeUser, password: 'hashed-pw' };

beforeEach(() => {
  jest.clearAllMocks();
  // The service logs caught errors before re-throwing; keep test output clean.
  jest.spyOn(console, 'error').mockImplementation(() => {});
  signJwt.mockReturnValue('signed-token');
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('signup', () => {
  it('rejects with 409 when the username already exists and never inserts', async () => {
    userExists.mockResolvedValue(true);

    await expect(
      signup({ username: 'alice', password: 'pw', role: UserRole.USER })
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(insertUser).not.toHaveBeenCalled();
  });

  it('hashes the password, stores the hash, and returns a user with a token', async () => {
    userExists.mockResolvedValue(false);
    hash.mockResolvedValue('hashed-pw');
    insertUser.mockResolvedValue(safeUser);

    const result = await signup({ username: 'alice', password: 'plaintext', role: UserRole.USER });

    expect(hash).toHaveBeenCalledWith('plaintext', 10);
    // The plaintext password must never reach the repository.
    expect(insertUser).toHaveBeenCalledWith({
      username: 'alice',
      hashedPassword: 'hashed-pw',
      role: UserRole.USER,
    });
    expect(signJwt).toHaveBeenCalledWith({ id: 'user-1', role: UserRole.USER, username: 'alice' });
    expect(result).toEqual({ user: safeUser, token: 'signed-token' });
  });
});

describe('login', () => {
  it('rejects with 401 when the user is not found', async () => {
    findUserByUsername.mockResolvedValue(null);

    await expect(login({ username: 'ghost', password: 'pw' })).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(compare).not.toHaveBeenCalled();
  });

  it('rejects with 401 when the password does not match', async () => {
    findUserByUsername.mockResolvedValue(fullUser);
    compare.mockResolvedValue(false);

    await expect(login({ username: 'alice', password: 'wrong' })).rejects.toBeInstanceOf(AppError);
  });

  it('returns a token and a password-free user on valid credentials', async () => {
    findUserByUsername.mockResolvedValue(fullUser);
    compare.mockResolvedValue(true);

    const result = await login({ username: 'alice', password: 'plaintext' });

    expect(compare).toHaveBeenCalledWith('plaintext', 'hashed-pw');
    expect(result.token).toBe('signed-token');
    expect(result.user).toEqual(safeUser);
    expect(result.user).not.toHaveProperty('password');
  });
});

describe('getMe', () => {
  it('rejects with 401 when the user no longer exists', async () => {
    findUserById.mockResolvedValue(null);

    await expect(getMe('user-1')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('returns the user without the password field', async () => {
    findUserById.mockResolvedValue(fullUser);

    const result = await getMe('user-1');

    expect(result).toEqual(safeUser);
    expect(result).not.toHaveProperty('password');
  });
});
