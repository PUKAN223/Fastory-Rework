import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

export interface StoreMembership {
  store_id: number;
  store: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
  };
  role: {
    id: number;
    name: string;
    permissions: Record<string, boolean>;
  };
}

export interface AuthUser {
  username: string;
  email: string;
  id: number;
  profile_picture_url: string | null;
  role: {
    id: number;
    name: string;
    permissions: Record<string, boolean>;
  } | null;
  storeMemberships: StoreMembership[];
}

type AuthStatus = "idle" | "loading" | "authed" | "guest";

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
};

const init: AuthState = { status: "idle", user: null, error: null };

type ApiRes<T> = {
  success?: boolean;
  message?: string;
  user?: T & { storeMemberships?: StoreMembership[] };
};

const jsonSafe = async <T>(r: Response): Promise<T> => {
  try {
    return (await r.json()) as T;
  } catch {
    return {} as T;
  }
};

const postJson = (url: string, body?: unknown) =>
  fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

const setAuthed = (state: AuthState, user: AuthUser) => {
  state.user = user;
  state.error = null;
  state.status = "authed";
};

const setGuest = (state: AuthState, error?: string | null) => {
  state.user = null;
  state.status = "guest";
  state.error = error ?? null;
};

export const authLogin = createAsyncThunk<
  AuthUser,
  { email: string; password: string },
  { rejectValue: string }
>("auth/login", async (body, { rejectWithValue }) => {
  const r = await postJson("/api/auth/login", body);
  const data = await jsonSafe<ApiRes<AuthUser>>(r);

  if (!r.ok || !data.success || !data.user) {
    return rejectWithValue(data.message ?? "Login failed");
  }

  return data.user;
});

export const authMe = createAsyncThunk<AuthUser, void, { rejectValue: string }>(
  "auth/me",
  async (_, { rejectWithValue }) => {
    const fetchMe = () => fetch("/api/auth/me", { cache: "no-store" });

    let r = await fetchMe();
    if (r.status === 401) {
      await postJson("/api/auth/refresh").catch(() => null);
      r = await fetchMe();
    }

    const data = await jsonSafe<ApiRes<AuthUser>>(r);

    if (!r.ok || !data.success || !data.user) {
      return rejectWithValue(data.message ?? "Unauthorized");
    }

    return data.user;
  },
);

export const authRegister = createAsyncThunk<
  AuthUser,
  { username: string; email: string; password: string },
  { rejectValue: string }
>("auth/register", async (body, { rejectWithValue }) => {
  const r = await postJson("/api/auth/register", body);
  const data = await jsonSafe<ApiRes<AuthUser>>(r);

  if (!r.ok || !data.success || !data.user) {
    return rejectWithValue(data.message ?? "Registration failed");
  }

  return data.user;
});

export const authSignOut = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>("auth/signOut", async (_, { rejectWithValue }) => {
  const r = await postJson("/api/auth/logout");
  const data = await jsonSafe<{ success?: boolean; message?: string }>(r);

  if (!r.ok || !data.success) {
    return rejectWithValue(data.message ?? "Sign out failed");
  }
});

const slice = createSlice({
  name: "auth",
  initialState: init,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.error = null;
      state.status = action.payload ? "authed" : "guest";
    },
    clearAuth(state) {
      setGuest(state, null);
    },
  },
  extraReducers: (b) => {
    b.addCase(authMe.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(authMe.fulfilled, (s, a) => setAuthed(s, a.payload));
    b.addCase(authMe.rejected, (s, a) =>
      setGuest(s, a.payload ?? a.error.message ?? "Unauthorized"),
    );

    b.addCase(authLogin.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(authLogin.fulfilled, (s, a) => setAuthed(s, a.payload));
    b.addCase(authLogin.rejected, (s, a) =>
      setGuest(s, a.payload ?? a.error.message ?? "Login failed"),
    );

    b.addCase(authRegister.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(authRegister.fulfilled, (s, a) => setAuthed(s, a.payload));
    b.addCase(authRegister.rejected, (s, a) =>
      setGuest(s, a.payload ?? a.error.message ?? "Registration failed"),
    );

    b.addCase(authSignOut.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(authSignOut.fulfilled, (s) => setGuest(s, null));
    b.addCase(authSignOut.rejected, (s, a) =>
      setGuest(s, a.payload ?? a.error.message ?? "Sign out failed"),
    );
  },
});

export const { setUser, clearAuth } = slice.actions;
export default slice.reducer;
