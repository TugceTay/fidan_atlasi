// supabase/functions/sign_photo_upload/index.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const allowedContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(body: unknown, status = 200, origin = "*") {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function sanitizeFileName(name: string) {
  return name.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
}

function extFor(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

serve(async (req) => {
  const origin = req.headers.get("origin") ?? "*";
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) {
      return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500, origin);
    }

    const { fileName, contentType } = await req.json().catch(() => ({}));
    if (!fileName || !contentType) {
      return json({ error: "fileName/contentType zorunlu" }, 400, origin);
    }
    if (!allowedContentTypes.has(contentType)) {
      return json({ error: "Desteklenmeyen contentType" }, 400, origin);
    }

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    const bucket = "photos";
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const safeName = sanitizeFileName(fileName);
    const finalName = safeName.includes(".") ? safeName : `${safeName}.${extFor(contentType)}`;
    const path = `${yyyy}/${mm}/${crypto.randomUUID()}_${finalName}`;

    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data?.signedUrl) {
      console.error("createSignedUploadUrl error", error);
      return json({ error: "Signed upload URL üretilemedi" }, 500, origin);
    }

    const token = new URL(data.signedUrl).searchParams.get("token");
    if (!token) {
      return json({ error: "Signed URL token üretilemedi" }, 500, origin);
    }

    const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

    return json({ bucket, path, token, publicUrl }, 200, origin);
  } catch (e) {
    console.error("sign_photo_upload crash", e);
    return json({ error: "Unexpected error" }, 500, origin);
  }
});
