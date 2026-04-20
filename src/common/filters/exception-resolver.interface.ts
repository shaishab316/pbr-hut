export interface ResolvedError {
  status: number;
  message: string;
  errors?: unknown;
}

export interface IExceptionResolver {
  supports(exception: unknown): boolean;
  resolve(exception: unknown): ResolvedError;
}
