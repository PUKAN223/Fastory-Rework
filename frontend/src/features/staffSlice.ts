import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { requestWithRefresh } from "@/lib/request";

export type StoreMember = {
  id: number;
  storeId: number;
  userId: number;
  jobTitle: string | null;
  permissions: Record<string, any>;
  user: {
    id: number;
    username: string;
    email: string;
    profileImageId: number | null;
  };
  createdAt: string;
};

type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

export type StaffState = {
  items: StoreMember[];
  fetchStatus: AsyncStatus;
  createStatus: AsyncStatus;
  updateStatus: AsyncStatus;
  deleteStatus: AsyncStatus;
  error: string | null;
};

const initialState: StaffState = {
  items: [],
  fetchStatus: "idle",
  createStatus: "idle",
  updateStatus: "idle",
  deleteStatus: "idle",
  error: null,
};

function normalizeMember(raw: any, existing?: StoreMember): StoreMember {
  return {
    id: Number(raw.id),
    storeId: Number(raw.store_id ?? raw.storeId ?? existing?.storeId ?? 0),
    userId: Number(
      raw.user_id ?? raw.userId ?? raw.user?.id ?? existing?.userId ?? 0,
    ),
    jobTitle: raw.job_title ?? raw.jobTitle ?? null,
    permissions: raw.permissions ?? {},
    user: raw.user
      ? {
          id: Number(raw.user.id),
          username: String(raw.user.username ?? ""),
          email: String(raw.user.email ?? ""),
          profileImageId:
            raw.user.profile_image_id ?? raw.user.profileImageId ?? null,
        }
      : (existing?.user ?? {
          id: 0,
          username: "",
          email: "",
          profileImageId: null,
        }),
    createdAt: String(
      raw.created_at ??
        raw.createdAt ??
        existing?.createdAt ??
        new Date().toISOString(),
    ),
  };
}

async function parseErrorMessage(response: Response, fallback: string) {
  const body = (await response
    .clone()
    .json()
    .catch(() => ({}))) as {
    message?: string;
    error?: string;
  };
  return body.message ?? body.error ?? fallback;
}

async function okJson<T>(r: Response, fallbackError: string): Promise<T> {
  if (!r.ok) {
    throw new Error(await parseErrorMessage(r, fallbackError));
  }
  return (await r.json().catch(() => ({}))) as T;
}

export const fetchMembers = createAsyncThunk<
  StoreMember[],
  number,
  { rejectValue: string }
>("staff/fetchMembers", async (storeId, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh(`/api/stores/${storeId}/members`);
    const body = await okJson<any>(r, "Failed to fetch members");
    return (body.data || body.members || body) as StoreMember[];
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to fetch members",
    );
  }
});

export const createMember = createAsyncThunk<
  StoreMember,
  { storeId: number; data: any },
  { rejectValue: string }
>("staff/createMember", async ({ storeId, data }, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh(`/api/stores/${storeId}/members`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    const body = await okJson<any>(r, "Failed to create member");
    return (body.data || body.member || body) as StoreMember;
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to create member",
    );
  }
});

export const updateMember = createAsyncThunk<
  StoreMember,
  { storeId: number; memberId: number; data: any },
  { rejectValue: string }
>(
  "staff/updateMember",
  async ({ storeId, memberId, data }, { rejectWithValue }) => {
    try {
      const r = await requestWithRefresh(
        `/api/stores/${storeId}/members/${memberId}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      );
      const body = await okJson<any>(r, "Failed to update member");
      return (body.data || body.member || body) as StoreMember;
    } catch (e) {
      return rejectWithValue(
        e instanceof Error ? e.message : "Failed to update member",
      );
    }
  },
);

export const deleteMember = createAsyncThunk<
  { id: number },
  { storeId: number; memberId: number },
  { rejectValue: string }
>("staff/deleteMember", async ({ storeId, memberId }, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh(
      `/api/stores/${storeId}/members/${memberId}`,
      {
        method: "DELETE",
      },
    );
    if (!r.ok)
      return rejectWithValue(
        await parseErrorMessage(r, "Failed to delete member"),
      );
    return { id: memberId };
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to delete member",
    );
  }
});

const setPending = (
  state: StaffState,
  key: keyof Pick<
    StaffState,
    "fetchStatus" | "createStatus" | "updateStatus" | "deleteStatus"
  >,
) => {
  state[key] = "loading";
  state.error = null;
};

const setRejected = (
  state: StaffState,
  key: keyof Pick<
    StaffState,
    "fetchStatus" | "createStatus" | "updateStatus" | "deleteStatus"
  >,
  action: any,
) => {
  state[key] = "failed";
  state.error = action.payload ?? action.error?.message ?? "Unknown error";
};

const slice = createSlice({
  name: "staff",
  initialState,
  reducers: {
    resetStaffData(state) {
      state.items = [];
      state.fetchStatus = "idle";
      state.createStatus = "idle";
      state.updateStatus = "idle";
      state.deleteStatus = "idle";
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchMembers.pending, (s) => setPending(s, "fetchStatus"));
    b.addCase(fetchMembers.fulfilled, (s, a) => {
      s.items = Array.isArray(a.payload)
        ? a.payload.map((m: any) => normalizeMember(m))
        : [];
      s.fetchStatus = "succeeded";
    });
    b.addCase(fetchMembers.rejected, (s, a) =>
      setRejected(s, "fetchStatus", a),
    );

    b.addCase(createMember.pending, (s) => setPending(s, "createStatus"));
    b.addCase(createMember.fulfilled, (s, a) => {
      s.items.push(normalizeMember(a.payload));
      s.createStatus = "succeeded";
    });
    b.addCase(createMember.rejected, (s, a) =>
      setRejected(s, "createStatus", a),
    );

    b.addCase(updateMember.pending, (s) => setPending(s, "updateStatus"));
    b.addCase(updateMember.fulfilled, (s, a) => {
      const i = s.items.findIndex((x) => Number(x.id) === Number(a.payload.id));
      if (i >= 0) {
        s.items[i] = normalizeMember(a.payload, s.items[i]);
      }
      s.updateStatus = "succeeded";
    });
    b.addCase(updateMember.rejected, (s, a) =>
      setRejected(s, "updateStatus", a),
    );

    b.addCase(deleteMember.pending, (s) => setPending(s, "deleteStatus"));
    b.addCase(deleteMember.fulfilled, (s, a) => {
      s.items = s.items.filter((x) => x.id !== a.payload.id);
      s.deleteStatus = "succeeded";
    });
    b.addCase(deleteMember.rejected, (s, a) =>
      setRejected(s, "deleteStatus", a),
    );
  },
});

export const { resetStaffData } = slice.actions;
export default slice.reducer;
