import type { AuthSession } from "./types/AuthSession";
import { randomUUID } from "crypto";

class AuthSessionStore {
  private accessSessions = new Map<string, AuthSession>();
  private refreshSessions = new Map<string, AuthSession>();

  private readonly accessTtlMs = 15 * 60 * 1000;
  private readonly refreshTtlMs = 14 * 24 * 60 * 60 * 1000;

  create(user: AuthSession["user"]) {
    const now = Date.now();
    const accessToken = randomUUID();
    const refreshToken = randomUUID();

    const session: AuthSession = {
      user,
      accessToken,
      refreshToken,
      createdAt: now,
      accessExpiresAt: now + this.accessTtlMs,
      refreshExpiresAt: now + this.refreshTtlMs,
    };

    this.accessSessions.set(accessToken, session);
    this.refreshSessions.set(refreshToken, session);

    return session;
  }

  getByAccessToken(accessToken: string) {
    const session = this.accessSessions.get(accessToken);
    if (!session) return null;

    if (session.accessExpiresAt <= Date.now()) {
      this.deleteByAccessToken(accessToken);
      return null;
    }

    return session;
  }

  rotateFromRefreshToken(refreshToken: string) {
    const session = this.refreshSessions.get(refreshToken);
    if (!session) return null;

    if (session.refreshExpiresAt <= Date.now()) {
      this.deleteByRefreshToken(refreshToken);
      return null;
    }

    this.deleteByRefreshToken(refreshToken);
    return this.create(session.user);
  }

  deleteByAccessToken(accessToken: string) {
    const session = this.accessSessions.get(accessToken);
    if (!session) return false;

    this.accessSessions.delete(session.accessToken);
    this.refreshSessions.delete(session.refreshToken);

    return true;
  }

  deleteByRefreshToken(refreshToken: string) {
    const session = this.refreshSessions.get(refreshToken);
    if (!session) return false;

    this.accessSessions.delete(session.accessToken);
    this.refreshSessions.delete(session.refreshToken);

    return true;
  }
}

const authSessionStore = new AuthSessionStore();

export { AuthSessionStore, authSessionStore };
