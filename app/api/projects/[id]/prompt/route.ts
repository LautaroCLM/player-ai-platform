import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const details = (body && body.details) || "";

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const instruction = `You are an expert prompt engineer. Expand the user's brief into a detailed, model-agnostic image generation prompt that can be used with any image-generation AI (Stable Diffusion, Midjourney, DALL·E, etc.). Be explicit about:
- subject and primary focal point
- camera angle, lens, and framing
- lighting and mood
- color palette and texture details
- clothing/props and background elements
- any desired negative prompts or things to avoid

Keep the prompt concise (1-3 sentences summary) and then a detailed bullet list the model can follow. The user details: "${String(details).trim()}"`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: instruction,
    });

    const generated = response.text;

    return NextResponse.json({ prompt: generated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Prompt generation failed" }, { status: 500 });
  }
}
