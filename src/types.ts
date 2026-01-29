export type Category = "seedling" | "meaningful_tree" | "route";

export type FocusFilter = "seedlings" | "monument_trees" | "route";

export type Entry = {
  id: string;
  category: Category;
  addedByName?: string;
  title?: string;
  description?: string;
  photoUrl?: string;
  photoPath?: string;
  lng: number;
  lat: number;
  createdAt: string;
};

export type Bounds = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export type EntriesInBboxRow = {
  id: string;
  category: Category;
  title: string | null;
  added_by_name?: string | null;
  description: string | null;
  photo_url: string | null;
  created_at: string;
  lng: number;
  lat: number;
};

export type CreateEntryPayload = {
  category: Category;
  title: string | null;
  addedByName?: string | null;
  description: string | null;
  lng: number;
  lat: number;
  photo_path?: string | null;
  photo_url?: string | null;
  turnstile_token: string;
};

export type CreateEntryResponse = {
  entry: EntriesInBboxRow | null;
};

export type SignPhotoUploadRequest = {
  fileName: string;
  contentType: string;
};

export type SignPhotoUploadResponse = {
  bucket: string;
  path: string;
  token: string;
  uploadUrl?: string;
  publicUrl?: string;
  signedUrl?: string;
};
