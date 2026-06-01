import { supabase } from "./supabase";

function sanitizeFileName(name: string) {
  // normalize unicode, remove diacritics
  const normalized = name.normalize("NFKD").replace(/\p{Diacritic}/gu, "");
  // replace spaces with dashes
  const replaced = normalized.replace(/\s+/g, "-");
  // remove any char that is not alphanumeric, dot, dash or underscore
  const cleaned = replaced.replace(/[^A-Za-z0-9._-]/g, "-");
  // collapse multiple dashes
  return cleaned.replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function uploadImage(file: File) {
  const safeName = sanitizeFileName(file.name || "file");
  const fileName = `${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage
    .from("player-images")
    .upload(fileName, file);

  if (error) throw error;

  const { data: publicUrl } = supabase.storage
    .from("player-images")
    .getPublicUrl(data.path);

  return publicUrl.publicUrl;
}
