export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const httpError = (statusCode: number, message: string): never => {
  throw new AppError(statusCode, message);
};
