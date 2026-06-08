import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const style = (body && (body.style === "long" ? "long" : "short")) || "short";
    const seed = (body && (body.seed || body.text || body.userText)) || "";
    // Fetch project with service role (server-side)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const supa = createClient(supabaseUrl, serviceKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    const { data: project, error: fetchError } = await supa.from("projects").select("*").eq("id", id).single();

    if (fetchError || !project) {
      console.error(fetchError);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Build a prompt based on the project and requested style. If the user supplied seed text,
    // instruct the model to improve or finish that text instead of inventing from scratch.
    const lengthHint = style === "long" ? "(detailed, up to 2-3 sentences)" : "(short and punchy, 1 sentence)";
    let promptBody = `Create a ${style} Instagram caption ${lengthHint} for this football player image. Image URL: ${project.image_url}. Created: ${project.created_at}.`;
    if (seed && String(seed).trim().length > 0) {
      promptBody = `The user wrote: "${String(seed).trim()}". Improve or finish this caption to make it professional, engaging, and suitable for an athlete post. Keep result ${lengthHint}. Image URL: ${project.image_url}.`;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
    You are a social media manager for professional football players.

    Generate an Instagram caption based on:

    ${promptBody}

    Make it professional and engaging.
    `,
    });

    const generatedCaption = response.text;

    // Save caption back to project
    const { error: updateError } = await supa
      .from("projects")
      .update({ caption: generatedCaption })
      .eq("id", id);

    if (updateError) {
      console.error(updateError);
      return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
    }

    return NextResponse.json({ caption: generatedCaption });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const supa = createClient(supabaseUrl, serviceKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    const { error } = await supa.from("projects").update({ caption: null }).eq("id", id);
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Failed to delete caption" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }
}
