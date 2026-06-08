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
    return NextResponse.json({ generation_id: genId }, { status: 202 });

    // NOTE: polling and finalization moved to GET /api/projects/[id]/flyer/status

    // Attempt to extract an image URL or base64 image
    function findImageSource(obj: any): string | null {
      if (!obj) return null;
      if (typeof obj === "string") {
        if (/^https?:\/\//i.test(obj)) return obj;
        if (/^data:image\//i.test(obj)) return obj;
        return null;
      }
      if (Array.isArray(obj)) {
        for (const v of obj) {
          const found = findImageSource(v);
          if (found) return found;
        }
      } else if (typeof obj === "object") {
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          if (typeof v === "string" && (/^https?:\/\//i.test(v) || /^data:image\//i.test(v))) return v;
        }
        for (const v of Object.values(obj)) {
          const found = findImageSource(v);
          if (found) return found;
        }
      }
      return null;
    }

    const imageSource = findImageSource(finalData) || null;
    if (!imageSource) {
      console.error("No image found in AI Horde response", finalData);
      return NextResponse.json({ error: "No image returned by generation" }, { status: 502 });
    }

    let imageBuffer: Buffer;
    let contentType = "image/png";

    if (/^data:image\//i.test(imageSource)) {
      // data URL
      const m = imageSource.match(/^data:(image\/[^;]+);base64,(.*)$/i);
      if (!m) {
        console.error("Unsupported data URL format");
        return NextResponse.json({ error: "Unsupported image format" }, { status: 502 });
      }
      contentType = m[1];
      imageBuffer = Buffer.from(m[2], "base64");
    } else {
      // Remote URL - fetch it
      const fetched = await fetch(imageSource);
      if (!fetched.ok) {
        const txt = await fetched.text().catch(() => "");
        console.error("Failed to fetch image from URL", fetched.status, txt);
        return NextResponse.json({ error: "Failed to download generated image", provider_status: fetched.status, provider_body: txt }, { status: 502 });
      }
      const arr = await fetched.arrayBuffer();
      imageBuffer = Buffer.from(arr);
      const ct = fetched.headers.get("content-type");
      if (ct) contentType = ct;
    }

    // Upload to Supabase storage
    const bucket = "flyers";
    const fileName = `${id}-${Date.now()}.png`;

    let uploadRes = await supa.storage.from(bucket).upload(fileName, imageBuffer, {
      contentType,
      upsert: false,
    });

    if (uploadRes.error) {
      console.error("Initial upload error", uploadRes.error);
      try {
        const createRes = await supa.storage.createBucket(bucket, { public: true });
        if (createRes.error) console.error("Create bucket error", createRes.error);
      } catch (e) {
        console.error("Create bucket threw", e);
      }

      uploadRes = await supa.storage.from(bucket).upload(fileName, imageBuffer, {
        contentType,
        upsert: false,
      });
    }

    if (uploadRes.error) {
      console.error(uploadRes.error);
      return NextResponse.json({ error: "Failed to upload flyer" }, { status: 500 });
    }

    const { data: publicUrl } = supa.storage.from(bucket).getPublicUrl(uploadRes.data.path);

    const { error: updateError } = await supa.from("projects").update({ flyer_url: publicUrl.publicUrl, flyer_title: title || null, flyer_subtitle: subtitle || null, flyer_date: date || null }).eq("id", id);

    if (updateError) {
      console.error(updateError);
      return NextResponse.json({ error: "Failed to update project with flyer" }, { status: 500 });
    }

    return NextResponse.json({ flyer_url: publicUrl.publicUrl, generation_id: genId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
