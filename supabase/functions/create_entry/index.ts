if (photoFile) {
  if (!supabase) {
    setUploadStatus("Supabase client yok");
    return;
  }

  setUploadStatus("Fotoğraf hazırlanıyor…");
  const blob = await ensureWebpWithin(photoFile, { maxBytes: 200 * 1024, maxSide: 1920 });

  setUploadStatus("Fotoğraf için yükleme izni alınıyor…");
  const signed = await signPhotoUpload({ fileName: photoFile.name, contentType: blob.type });

  if (signed.error) {
    console.error("sign_photo_upload failed", signed.error);
    setUploadStatus("Fotoğraf izni alınamadı");
    return;
  }
  if (!signed.data?.bucket || !signed.data?.path || !signed.data?.token) {
    console.error("sign_photo_upload missing fields", signed.data);
    setUploadStatus("Fotoğraf izni eksik");
    return;
  }

  setUploadStatus("Fotoğraf yükleniyor…");
  const { error: uploadError } = await supabase.storage
    .from(signed.data.bucket)
    .uploadToSignedUrl(signed.data.path, signed.data.token, blob, {
      contentType: blob.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("uploadToSignedUrl failed", uploadError);
    setUploadStatus("Fotoğraf yükleme hatası");
    return;
  }

  photoPath = signed.data.path;

  // Public URL (bucket public ise)
  const { data: pub } = supabase.storage.from(signed.data.bucket).getPublicUrl(signed.data.path);
  photoUrl = pub.publicUrl;

  setUploadStatus("Fotoğraf yüklendi");
}
