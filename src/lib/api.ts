// src/lib/api.ts
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type {
  Bounds,
  CreateEntryPayload,
  CreateEntryResponse,
  Entry,
  EntriesInBboxRow,
  SignPhotoUploadRequest,
  SignPhotoUploadResponse,
} from "../types";

function mapEntry(row: EntriesInBboxRow): Entry {
  return {
    id: row.id,
    category: row.category,
    addedByName: row.added_by_name ?? row.title ?? undefined,
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    lng: row.lng,
    lat: row.lat,
    createdAt: row.created_at,
  };
}

export async function createEntry(
  payload: CreateEntryPayload
): Promise<{ data: Entry | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: "Supabase yapılandırılmamış" };
  }

  const { data, error } = await supabase.functions.invoke<any>("create_entry", {
    body: payload,
  });

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Yanıt boş" };

  // Normalize: { entry: ... } bekliyoruz; bazı sürümlerde direkt satır gelebilir
  const normalized: CreateEntryResponse =
    (data as any).entry ? (data as CreateEntryResponse) : ({ entry: data } as CreateEntryResponse);

  if (!normalized.entry) return { data: null, error: "Yanıt eksik (entry)" };

  return { data: mapEntry(normalized.entry), error: null };
}

export async function signPhotoUpload(
  payload: SignPhotoUploadRequest
): Promise<{ data: SignPhotoUploadResponse | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: "Supabase yapılandırılmamış" };
  }

  const { data, error } = await supabase.functions.invoke<any>("sign_photo_upload", {
    body: payload,
  });

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Yanıt boş" };

  // Normalize: (bucket/path/token) yoksa uploadUrl/signedUrl içinden çıkar
  let bucket: string | undefined = data.bucket;
  let path: string | undefined = data.path;
  let token: string | undefined = data.token;

  const signedUrl: string | undefined = data.signedUrl ?? data.uploadUrl;

  if ((!bucket || !token) && signedUrl) {
    try {
      const u = new URL(signedUrl);
      token = token ?? u.searchParams.get("token") ?? undefined;

      const m = u.pathname.match(/\/object\/upload\/sign\/([^/]+)\/(.+)$/);
      bucket = bucket ?? m?.[1];
      path = path ?? m?.[2];
    } catch {
      // ignore
    }
  }

  if (!bucket || !path || !token) {
    return { data: null, error: "Yanıt eksik (bucket/path/token)" };
  }

  // Tipi bozmayalım diye sadece gerekli alanları garanti ediyoruz
  const normalized = { ...data, bucket, path, token, uploadUrl: data.uploadUrl ?? signedUrl } as SignPhotoUploadResponse;
  return { data: normalized, error: null };
}

export async function fetchEntriesInBbox(
  bounds: Bounds,
  filter: string
): Promise<{ data: Entry[] | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: "Supabase yapılandırılmamış" };
  }

  const { data, error } = await supabase.rpc("entries_in_bbox", {
    min_lng: bounds.minLng,
    min_lat: bounds.minLat,
    max_lng: bounds.maxLng,
    max_lat: bounds.maxLat,
    cat: filter === "all" ? null : filter,
  });

  if (error) return { data: null, error: error.message };
  const rows = (data ?? []) as EntriesInBboxRow[];
  return { data: rows.map(mapEntry), error: null };
}

export async function deleteEntryById(id: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: "Supabase yapılandırılmamış" };
  }

  const { error } = await supabase.functions.invoke<any>("delete_entry", {
    body: { id },
  });

  if (error) return { error: error.message };
  return { error: null };
}
