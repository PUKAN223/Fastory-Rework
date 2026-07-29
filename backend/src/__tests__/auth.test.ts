import { describe, it, expect, beforeEach, mock } from "bun:test";
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
  storeMemberships: [
    {
      store_id: 1,
      store: {
        id: 1,
        name: "Test Store",
        slug: "test-store",
        description: "A test store",
      },
      jobTitle: "Owner",
      permissions: { "*": true },
    },
  ],
};

let store: AuthSessionStore;

beforeEach(() => {
  store = new AuthSessionStore();
});

describe("Auth flow (session lifecycle)", () => {
  it("should complete full auth lifecycle: create → get → rotate → invalidate", () => {
    // 1. Create session (simulates register/login)
    const session = store.create(mockUser);
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();

    // 2. Get user by access token
    const found = store.getByAccessToken(session.accessToken);
    expect(found).not.toBeNull();
    expect(found!.user.username).toBe("testuser");

    // 3. Rotate refresh token (simulates token refresh)
    const newSession = store.rotateFromRefreshToken(session.refreshToken);
    expect(newSession).not.toBeNull();
    expect(newSession!.accessToken).not.toBe(session.accessToken);

    // 4. Old access token should be invalid
    expect(store.getByAccessToken(session.accessToken)).toBeNull();

    // 5. New access token should work
    expect(store.getByAccessToken(newSession!.accessToken)).not.toBeNull();

    // 6. Logout (delete by new access token)
    const deleted = store.deleteByAccessToken(newSession!.accessToken);
    expect(deleted).toBe(true);

    // 7. Session should be completely gone
    expect(store.getByAccessToken(newSession!.accessToken)).toBeNull();
    expect(store.rotateFromRefreshToken(newSession!.refreshToken)).toBeNull();
  });

  it("should handle multiple concurrent sessions", () => {
    const session1 = store.create(mockUser);
    const session2 = store.create(mockUser);

    // Both should be valid
    expect(store.getByAccessToken(session1.accessToken)).not.toBeNull();
    expect(store.getByAccessToken(session2.accessToken)).not.toBeNull();

    // Logging out one shouldn't affect the other
    store.deleteByAccessToken(session1.accessToken);
    expect(store.getByAccessToken(session1.accessToken)).toBeNull();
    expect(store.getByAccessToken(session2.accessToken)).not.toBeNull();
  });

  it("should preserve user data through session lifecycle", () => {
    const session = store.create(mockUser);
    const found = store.getByAccessToken(session.accessToken);

    expect(found!.user.id).toBe(1);
    expect(found!.user.email).toBe("test@example.com");
    expect(found!.user.storeMemberships).toHaveLength(1);
    expect(found!.user.storeMemberships[0].store.name).toBe("Test Store");
  });
});
