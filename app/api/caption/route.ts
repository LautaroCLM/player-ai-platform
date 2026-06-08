import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
You are a social media manager for professional football players.

Generate a short Instagram caption based on:

${prompt}

Make it professional and engaging.
`,
    });

    return NextResponse.json({
      caption: response.text,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to generate caption" },
      { status: 500 }
    );
  }
}
