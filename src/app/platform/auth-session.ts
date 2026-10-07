import { InjectionToken } from '@angular/core';

export type AuthSessionState =
  | { mode: 'anonymous-local' }
  | { mode: 'authenticated'; accountId: string; displayName?: string }
  | { mode: 'reauth-required'; accountId: string }
  | { mode: 'signed-out' };

export interface AuthSession {
  readonly source: 'local-only' | 'verified-provider';
  current(): AuthSessionState;
  signOut(): Promise<void>;
}

/** Current local-first identity. It owns no learning data and proves no account ownership. */
export class LocalAuthSession implements AuthSession {
  readonly source = 'local-only' as const;
  private state: AuthSessionState = { mode: 'anonymous-local' };
  current(): AuthSessionState { return this.state; }
  async signOut(): Promise<void> { this.state = { mode: 'signed-out' }; }
}

export const AUTH_SESSION = new InjectionToken<AuthSession>('HoloRecall auth session', {
  providedIn: 'root', factory: () => new LocalAuthSession(),
});
