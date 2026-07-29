import { describe, expect, it } from "vitest";
import reducer, {
  type AuthUser,
  clearAuth,
  setUser,
} from "@/features/authSlice";

const mockUser: AuthUser = {
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
        description: null,
      },
      role: {
        id: 1,
        name: "Owner",
        permissions: { "*": true },
      },
    },
  ],
};

describe("authSlice", () => {
  const initialState = {
    status: "idle" as const,
    user: null,
    error: null,
  };

  describe("reducers", () => {
    it("should return initial state", () => {
      expect(reducer(undefined, { type: "unknown" })).toEqual(initialState);
    });

    it("should set user with authed status", () => {
      const state = reducer(initialState, setUser(mockUser));
      expect(state.user).toEqual(mockUser);
      expect(state.status).toBe("authed");
      expect(state.error).toBeNull();
    });

    it("should clear user with guest status", () => {
      const prev = {
        ...initialState,
        status: "authed" as const,
        user: mockUser,
      };
      const state = reducer(prev, clearAuth());
      expect(state.user).toBeNull();
      expect(state.status).toBe("guest");
    });
  });

  describe("authLogin thunk reducers", () => {
    it("should handle pending", () => {
      const state = reducer(initialState, {
        type: "auth/login/pending",
      });
      expect(state.status).toBe("loading");
      expect(state.error).toBeNull();
    });

    it("should handle fulfilled", () => {
      const state = reducer(initialState, {
        type: "auth/login/fulfilled",
        payload: mockUser,
      });
      expect(state.status).toBe("authed");
      expect(state.user).toEqual(mockUser);
    });

    it("should handle rejected", () => {
      const state = reducer(initialState, {
        type: "auth/login/rejected",
        payload: "Invalid credentials",
      });
      expect(state.status).toBe("guest");
      expect(state.error).toBe("Invalid credentials");
    });
  });

  describe("authMe thunk reducers", () => {
    it("should handle pending", () => {
      const state = reducer(initialState, {
        type: "auth/me/pending",
      });
      expect(state.status).toBe("loading");
    });

    it("should handle fulfilled", () => {
      const state = reducer(initialState, {
        type: "auth/me/fulfilled",
        payload: mockUser,
      });
      expect(state.status).toBe("authed");
      expect(state.user?.storeMemberships).toHaveLength(1);
    });

    it("should handle rejected", () => {
      const state = reducer(initialState, {
        type: "auth/me/rejected",
        payload: "Unauthorized",
      });
      expect(state.status).toBe("guest");
      expect(state.error).toBe("Unauthorized");
    });
  });

  describe("authRegister thunk reducers", () => {
    it("should handle fulfilled", () => {
      const state = reducer(initialState, {
        type: "auth/register/fulfilled",
        payload: mockUser,
      });
      expect(state.status).toBe("authed");
      expect(state.user?.username).toBe("testuser");
    });

    it("should handle rejected", () => {
      const state = reducer(initialState, {
        type: "auth/register/rejected",
        payload: "Email already exists",
      });
      expect(state.status).toBe("guest");
      expect(state.error).toBe("Email already exists");
    });
  });

  describe("authSignOut thunk reducers", () => {
    it("should handle fulfilled", () => {
      const prev = {
        ...initialState,
        status: "authed" as const,
        user: mockUser,
      };
      const state = reducer(prev, {
        type: "auth/signOut/fulfilled",
      });
      expect(state.status).toBe("guest");
      expect(state.user).toBeNull();
    });
  });
});
