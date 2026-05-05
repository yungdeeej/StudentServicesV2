import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuthContext } from './rbac/scope.js';

export type RequestContext = {
  correlation_id: string;
  user_id?: string;
  scope?: AuthContext['scope'];
  role?: AuthContext['role'];
};

export const als = new AsyncLocalStorage<RequestContext>();

export function withContext<T>(ctx: RequestContext, fn: () => Promise<T> | T): Promise<T> | T {
  return als.run(ctx, fn);
}

export function currentContext(): RequestContext | undefined {
  return als.getStore();
}
