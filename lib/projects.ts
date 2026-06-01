import { supabase } from "./supabase";

export async function createProject(
  userId: string,
  imageUrl: string
) {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      image_url: imageUrl,
    });

  if (error) throw error;

  return data;
}
