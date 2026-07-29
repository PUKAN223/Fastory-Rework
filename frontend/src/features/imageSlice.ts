import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { formatImageSrc } from "@/lib/formatImageSrc";
import { requestWithRefresh } from "@/lib/request";
import type { CreateImagePayload, ImageAsset } from "@/types/images";

type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

type ImagesState = {
  items: ImageAsset[];
  fetchStatus: AsyncStatus;
  createStatus: AsyncStatus;
  updateStatus: AsyncStatus;
  deleteStatus: AsyncStatus;
  error: string | null;
};

type ApiImage = {
  id?: number | string;
  url?: string;
  created_at?: string;
  updated_at?: string;
};

type ApiListResponse = {
  data?: ApiImage[];
  images?: ApiImage[];
};

const dataUrlBase64Pattern = /^data:[^;]+;base64,[A-Za-z0-9+/=]+$/i;
const rawBase64Pattern =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const initialState: ImagesState = {
  items: [],
  fetchStatus: "idle",
  createStatus: "idle",
  updateStatus: "idle",
  deleteStatus: "idle",
  error: null,
};

const toSafeString = (v: unknown, fb = "") => (typeof v === "string" ? v : fb);

const isBase64ImageValue = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return false;

  if (dataUrlBase64Pattern.test(trimmedValue)) return true;

  const normalized = trimmedValue.replace(/\s/g, "");
  return (
    normalized.length > 0 &&
    normalized.length % 4 === 0 &&
    rawBase64Pattern.test(normalized)
  );
};

function normalizeImage(raw: ApiImage): ImageAsset {
  if (raw.id === undefined || raw.id === null) {
    throw new Error("Image id is missing in API response");
  }

  const rawUrl = toSafeString(raw.url, "");
  const url = formatImageSrc(rawUrl);

  return {
    id: String(raw.id),
    url,
    isBase64: isBase64ImageValue(url),
    createdAt: toSafeString(raw.created_at, new Date().toISOString()),
    updatedAt: toSafeString(raw.updated_at, new Date().toISOString()),
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

const readApiList = (body: unknown): ApiImage[] => {
  if (Array.isArray(body)) return body as ApiImage[];
  if (body && typeof body === "object") {
    const b = body as ApiListResponse;
    return b.data ?? b.images ?? [];
  }
  return [];
};

const readApiOne = (body: unknown): ApiImage | null => {
  if (body && typeof body === "object") {
    const obj = body as ApiImage & { image?: ApiImage; data?: ApiImage };
    if (obj.id !== undefined && obj.id !== null) {
      return obj;
    }
    return obj.image ?? obj.data ?? null;
  }
  return null;
};

async function okJson<T>(r: Response, fallbackError: string): Promise<T> {
  if (!r.ok) throw new Error(await parseErrorMessage(r, fallbackError));
  return (await r.json().catch(() => ({}))) as T;
}

export const fetchImages = createAsyncThunk<
  ImageAsset[],
  void,
  { rejectValue: string }
>("images/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh("/api/images");
    const body = await okJson<unknown>(r, "Failed to fetch images");

    return readApiList(body)
      .map((x) => {
        try {
          return normalizeImage(x);
        } catch {
          return null;
        }
      })
      .filter((x): x is ImageAsset => x !== null);
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to fetch images",
    );
  }
});

export const createImage = createAsyncThunk<
  ImageAsset,
  CreateImagePayload,
  { rejectValue: string }
>("images/create", async (payload, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh("/api/images", {
      method: "POST",
      body: JSON.stringify({
        url: payload.url,
      }),
    });
    const body = await okJson<unknown>(r, "Failed to create image");
    const raw = readApiOne(body);
    if (!raw) {
      return rejectWithValue("Created image data is missing");
    }
    return normalizeImage(raw);
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to create image",
    );
  }
});

export const updateImage = createAsyncThunk<
  ImageAsset,
  { id: string; data: Partial<CreateImagePayload> },
  { rejectValue: string }
>("images/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh(`/api/images/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        url: data.url,
      }),
    });
    const body = await okJson<unknown>(r, "Failed to update image");
    const raw = readApiOne(body);
    if (!raw) {
      return rejectWithValue("Updated image data is missing");
    }
    return normalizeImage(raw);
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to update image",
    );
  }
});

export const deleteImage = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("images/delete", async (id, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh(`/api/images/${id}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      return rejectWithValue(
        await parseErrorMessage(r, "Failed to delete image"),
      );
    }
    return id;
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to delete image",
    );
  }
});

const slice = createSlice({
  name: "images",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchImages.pending, (s) => {
      s.fetchStatus = "loading";
      s.error = null;
    });
    b.addCase(fetchImages.fulfilled, (s, a) => {
      s.items = a.payload;
      s.fetchStatus = "succeeded";
    });
    b.addCase(fetchImages.rejected, (s, a) => {
      s.fetchStatus = "failed";
      s.error = a.payload ?? a.error.message ?? "Unknown error";
    });

    b.addCase(createImage.pending, (s) => {
      s.createStatus = "loading";
      s.error = null;
    });
    b.addCase(createImage.fulfilled, (s, a) => {
      s.items.unshift(a.payload);
      s.createStatus = "succeeded";
    });
    b.addCase(createImage.rejected, (s, a) => {
      s.createStatus = "failed";
      s.error = a.payload ?? a.error.message ?? "Unknown error";
    });

    b.addCase(updateImage.pending, (s) => {
      s.updateStatus = "loading";
      s.error = null;
    });
    b.addCase(updateImage.fulfilled, (s, a) => {
      const index = s.items.findIndex((item) => item.id === a.payload.id);
      if (index >= 0) {
        s.items[index] = a.payload;
      }
      s.updateStatus = "succeeded";
    });
    b.addCase(updateImage.rejected, (s, a) => {
      s.updateStatus = "failed";
      s.error = a.payload ?? a.error.message ?? "Unknown error";
    });

    b.addCase(deleteImage.pending, (s) => {
      s.deleteStatus = "loading";
      s.error = null;
    });
    b.addCase(deleteImage.fulfilled, (s, a) => {
      s.items = s.items.filter((item) => item.id !== a.payload);
      s.deleteStatus = "succeeded";
    });
    b.addCase(deleteImage.rejected, (s, a) => {
      s.deleteStatus = "failed";
      s.error = a.payload ?? a.error.message ?? "Unknown error";
    });
  },
});

export default slice.reducer;
