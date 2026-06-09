import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const { title, subtitle, date, teams, playerName } = body || {};

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const supa = createClient(supabaseUrl, serviceKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    const { data: project, error: fetchError } = await supa.from("projects").select("*").eq("id", id).single();

    if (fetchError || !project) {
      console.error(fetchError);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const imageUrl = project.image_url || "";

    // Build a stronger visual design prompt for Gemini to return a finished SVG flyer.
    // Request ONLY the SVG markup so we can store it as an image.
    // Build a prompt for AI Horde (raster image generation). We include the project player image URL as a visual reference.
    const prompt = `Matchday sports flyer. Title: ${title || ""}. Subtitle: ${subtitle || ""}. Date: ${date || ""}. Teams: ${teams || ""}. Player: ${playerName || ""}. Use the player photo as the main element: ${imageUrl || ""}. Strong sports color palette, bold title, readable date and teams, poster layout.`;

    // Create generation on AI Horde
    const aihordeKey = process.env.AI_HORDE_API_KEY;
    if (!aihordeKey) {
      console.error("Missing AI_HORDE_API_KEY");
      return NextResponse.json({ error: "Server misconfigured: missing AI_HORDE_API_KEY" }, { status: 500 });
    }

    const createResp = await fetch("https://aihorde.net/api/v2/generate/async", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // AI Horde expects the API key in the `apikey` header
        apikey: aihordeKey,
      },
      body: JSON.stringify({ prompt }),
    });

    if (!createResp.ok) {
      const txt = await createResp.text().catch(() => "");
      console.error("AI Horde create failed", createResp.status, txt);
      return NextResponse.json({ error: "Failed to create generation", provider_status: createResp.status, provider_body: txt }, { status: 502 });
    }

    const createData = await createResp.json().catch(() => ({} as any));
    const genId: string | undefined = createData?.id || createData?.generation_id || createData?.g_id;
    if (!genId) {
      console.error("AI Horde create response missing id", createData);
      return NextResponse.json({ error: "Invalid generation response" }, { status: 502 });
    }

    // Save generation id to project if possible (non-fatal)
    try {
      const { error: saveErr } = await supa.from("projects").update({ flyer_generation_id: genId }).eq("id", id);
      if (saveErr) {
        // not fatal — log and continue
        console.warn("Could not save generation id to project", saveErr);
      }
    } catch (e) {
      console.warn("Error saving generation id", e);
    }

    // Return immediately with 202 Accepted and generation id. Client will poll status endpoint.
    // Finalization (polling, image download and upload) is handled by the
    // GET /api/projects/[id]/flyer/status route. No further processing here.
    return NextResponse.json({ generation_id: genId }, { status: 202 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
