import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const url = new URL(req.url);
    const genId = url.searchParams.get("genId");
    if (!genId) return NextResponse.json({ error: "Missing genId" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const supa = createClient(supabaseUrl, serviceKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    const aihordeKey = process.env.AI_HORDE_API_KEY;
    if (!aihordeKey) return NextResponse.json({ error: "Server misconfigured: missing AI_HORDE_API_KEY" }, { status: 500 });

    const statusUrl = `https://aihorde.net/api/v2/generate/status/${encodeURIComponent(genId)}`;
    const finalResp = await fetch(statusUrl, { headers: { apikey: aihordeKey } });
    if (!finalResp.ok) {
      const txt = await finalResp.text().catch(() => "");
      console.error("AI Horde status failed", finalResp.status, txt);
      return NextResponse.json({ error: "Failed to fetch generation status", provider_status: finalResp.status, provider_body: txt }, { status: 502 });
    }

    const data = await finalResp.json().catch(() => ({} as any));

    // If still waiting / queued
    if (data.waiting || (typeof data.queue_position !== "undefined" && (data.done === false || data.finished === 0))) {
      return NextResponse.json({ status: "processing", queue_position: data.queue_position ?? null, provider: data });
    }

    // If the provider indicates it's not done but has processing info
    if (data.done === false && !data.generations) {
      return NextResponse.json({ status: "processing", queue_position: data.queue_position ?? null, provider: data });
    }

    // Helper to find image urls / data urls
    function findImageSource(obj: any): string | null {
      if (!obj) return null;
      if (typeof obj === "string") {
        if (/^https?:\/\//i.test(obj)) return obj;
        if (/^data:image\//i.test(obj)) return obj;
        return null;
      }
      if (Array.isArray(obj)) {
        for (const v of obj) {
          const f = findImageSource(v);
          if (f) return f;
        }
      } else if (typeof obj === "object") {
        for (const v of Object.values(obj)) {
          const f = findImageSource(v);
          if (f) return f;
        }
      }
      return null;
    }

    // Try to extract image from response
    const imageSource = findImageSource(data) || null;

    if (!imageSource) {
      // Not ready yet
      return NextResponse.json({ status: "processing", queue_position: data.queue_position ?? null, provider: data });
    }

    // Download the image
    let imageBuffer: Buffer;
    let contentType = "image/png";

    if (/^data:image\//i.test(imageSource)) {
      const m = imageSource.match(/^data:(image\/[^;]+);base64,(.*)$/i);
      if (!m) return NextResponse.json({ error: "Unsupported data URL format" }, { status: 502 });
      contentType = m[1];
      imageBuffer = Buffer.from(m[2], "base64");
    } else {
      const fetched = await fetch(imageSource);
      if (!fetched.ok) {
        const txt = await fetched.text().catch(() => "");
        console.error("Failed to download generated image", fetched.status, txt);
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

    // Update project with flyer_url
    try {
      const { error: updateError } = await supa.from("projects").update({ flyer_url: publicUrl.publicUrl }).eq("id", id);
      if (updateError) console.error("Failed to update project with flyer", updateError);
    } catch (e) {
      console.error("Update project threw", e);
    }

    return NextResponse.json({ status: "completed", flyer_url: publicUrl.publicUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Status check failed" }, { status: 500 });
  }
}
