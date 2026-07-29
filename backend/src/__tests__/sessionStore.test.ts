import { describe, it, expect, beforeEach } from "bun:test";
import { AuthSessionStore } from "../api/auth/sessionStore";
import type { AuthSession } from "../api/auth/types/AuthSession";

const mockUser: AuthSession["user"] = {
  username: "testuser",
  email: "test@example.com",
  id: 1,
  profile_picture_url: null,
  role: {
    id: 1,
    name: "User",
    permissions: { "products:read": true },
  },
  storeMemberships: [],
};

// We need our own instance to avoid polluting the global singleton
let store: AuthSessionStore;

beforeEach(() => {
  store = new AuthSessionStore();
});

describe("AuthSessionStore", () => {
  describe("create", () => {
    it("should create a session with tokens", () => {
      const session = store.create(mockUser);

      expect(session.accessToken).toBeTruthy();
      expect(session.refreshToken).toBeTruthy();
      expect(session.user).toEqual(mockUser);
      expect(session.createdAt).toBeGreaterThan(0);
      expect(session.accessExpiresAt).toBeGreaterThan(session.createdAt);
      expect(session.refreshExpiresAt).toBeGreaterThan(session.accessExpiresAt);
    });

    it("should generate unique tokens for each session", () => {
      const s1 = store.create(mockUser);
      const s2 = store.create(mockUser);

      expect(s1.accessToken).not.toBe(s2.accessToken);
      expect(s1.refreshToken).not.toBe(s2.refreshToken);
    });

    it("should set access token TTL to 15 minutes", () => {
      const session = store.create(mockUser);
      const expectedTtl = 15 * 60 * 1000;

      expect(session.accessExpiresAt - session.createdAt).toBe(expectedTtl);
    });

    it("should set refresh token TTL to 14 days", () => {
      const session = store.create(mockUser);
      const expectedTtl = 14 * 24 * 60 * 60 * 1000;

      expect(session.refreshExpiresAt - session.createdAt).toBe(expectedTtl);
    });
  });

  describe("getByAccessToken", () => {
    it("should return session for valid access token", () => {
      const created = store.create(mockUser);
      const found = store.getByAccessToken(created.accessToken);

      expect(found).not.toBeNull();
      expect(found!.user.id).toBe(mockUser.id);
      expect(found!.accessToken).toBe(created.accessToken);
    });

    it("should return null for invalid access token", () => {
      const found = store.getByAccessToken("nonexistent-token");
      expect(found).toBeNull();
    });
  });

  describe("rotateFromRefreshToken", () => {
    it("should create new session from valid refresh token", () => {
      const original = store.create(mockUser);
      const newSession = store.rotateFromRefreshToken(original.refreshToken);

      expect(newSession).not.toBeNull();
      expect(newSession!.accessToken).not.toBe(original.accessToken);
      expect(newSession!.refreshToken).not.toBe(original.refreshToken);
      expect(newSession!.user.id).toBe(mockUser.id);
    });

    it("should invalidate old refresh token after rotation", () => {
      const original = store.create(mockUser);
      store.rotateFromRefreshToken(original.refreshToken);

      const found = store.rotateFromRefreshToken(original.refreshToken);
      expect(found).toBeNull();
    });

    it("should return null for invalid refresh token", () => {
      const found = store.rotateFromRefreshToken("nonexistent-token");
      expect(found).toBeNull();
    });

    it("should make old access token invalid after rotation", () => {
      const original = store.create(mockUser);
      store.rotateFromRefreshToken(original.refreshToken);

      const found = store.getByAccessToken(original.accessToken);
      expect(found).toBeNull();
    });
  });

  describe("deleteByAccessToken", () => {
    it("should delete session by access token", () => {
      const session = store.create(mockUser);
      const deleted = store.deleteByAccessToken(session.accessToken);

      expect(deleted).toBe(true);
      expect(store.getByAccessToken(session.accessToken)).toBeNull();
    });

    it("should return false for non-existent token", () => {
      const deleted = store.deleteByAccessToken("nonexistent");
      expect(deleted).toBe(false);
    });

    it("should also remove refresh token when deleting by access token", () => {
      const session = store.create(mockUser);
      store.deleteByAccessToken(session.accessToken);

      const rotated = store.rotateFromRefreshToken(session.refreshToken);
      expect(rotated).toBeNull();
    });
  });

  describe("deleteByRefreshToken", () => {
    it("should delete session by refresh token", () => {
      const session = store.create(mockUser);
      const deleted = store.deleteByRefreshToken(session.refreshToken);

      expect(deleted).toBe(true);
      expect(store.getByAccessToken(session.accessToken)).toBeNull();
    });

    it("should return false for non-existent token", () => {
      const deleted = store.deleteByRefreshToken("nonexistent");
      expect(deleted).toBe(false);
    });
  });
});
