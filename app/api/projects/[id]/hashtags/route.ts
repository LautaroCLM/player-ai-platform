import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const supa = createClient(supabaseUrl, serviceKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    const { data: project, error: fetchError } = await supa.from("projects").select("*").eq("id", id).single();

    if (fetchError || !project) {
      console.error(fetchError);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const promptBody = `Create a list of 8 relevant Instagram hashtags (comma separated) for this football player image. Image URL: ${project.image_url}. Use popular and contextual hashtags.`;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
You are a social media strategist for football players.

Generate 8 concise, high-quality hashtags based on:

${promptBody}

Return them as a single line, comma separated.
`,
    });

    const generated = response.text;

    const { error: updateError } = await supa.from("projects").update({ hashtags: generated }).eq("id", id);

    if (updateError) {
      console.error(updateError);
      return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
    }

    return NextResponse.json({ hashtags: generated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
