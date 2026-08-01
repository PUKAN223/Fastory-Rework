import { describe, it, expect } from "bun:test";
import { AuthSessionStore } from "../api/auth/sessionStore";
import type { AuthSession } from "../api/auth/types/AuthSession";

describe("User Profile & Account Deletion Session Management", () => {
  const store = new AuthSessionStore();

  const user: AuthSession["user"] = {
    id: 99,
    username: "john_doe",
    email: "john@example.com",
    profile_picture_url: "https://example.com/old.png",
    bio: "Hello world",
    role: { id: 1, name: "User", permissions: {} },
    storeMemberships: [],
  };

  it("should support updating profile fields in active session", () => {
    const session = store.create(user);
    expect(session.user.username).toBe("john_doe");
    expect(session.user.bio).toBe("Hello world");

    // Simulate profile update in session
    session.user.username = "john_updated";
    session.user.profile_picture_url = "https://example.com/new.png";
    session.user.bio = "Updated bio text";

    const retrieved = store.getByAccessToken(session.accessToken);
    expect(retrieved?.user.username).toBe("john_updated");
    expect(retrieved?.user.profile_picture_url).toBe("https://example.com/new.png");
    expect(retrieved?.user.bio).toBe("Updated bio text");
  });

  it("should revoke active session upon account deletion", () => {
    const session = store.create(user);
    expect(store.getByAccessToken(session.accessToken)).not.toBeNull();

    // Revoke session on deletion
    store.deleteByAccessToken(session.accessToken);
    expect(store.getByAccessToken(session.accessToken)).toBeNull();
  });
});
