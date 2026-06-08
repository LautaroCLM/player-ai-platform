"use client";

import { useState } from "react";

type Props = {
  id: string;
  initialCaption?: string | null;
  imageUrl?: string | null;
};

export default function ProjectActions({ id, initialCaption, imageUrl }: Props) {
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState<string | null>(initialCaption ?? null);
  const [hashtags, setHashtags] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCaptionMenu, setShowCaptionMenu] = useState(false);
  const [editingImage, setEditingImage] = useState(false);
  const [localImage, setLocalImage] = useState<string | null>(imageUrl ?? null);
  const [newImageUrl, setNewImageUrl] = useState<string>("");
  const [seedText, setSeedText] = useState<string>("");
  const [showFlyerMenu, setShowFlyerMenu] = useState(false);
  const [showPromptMenu, setShowPromptMenu] = useState(false);
  const [promptDetails, setPromptDetails] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [flyerTitle, setFlyerTitle] = useState("");
  const [flyerSubtitle, setFlyerSubtitle] = useState("");
  const [flyerDate, setFlyerDate] = useState("");
  const [flyerTeams, setFlyerTeams] = useState("");
  const [flyerPlayer, setFlyerPlayer] = useState("");
  const [flyerUrl, setFlyerUrl] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const pollRef = (globalThis as any).__flyerPollRef || { current: null };
  if (!(globalThis as any).__flyerPollRef) (globalThis as any).__flyerPollRef = pollRef;

  async function handleGenerateCaption(style: "short" | "long" = "short", seed?: string) {
    setLoading(true);
    setError(null);
    setShowCaptionMenu(false);

    const payload: any = { style };
    if (seed && seed.trim()) payload.seed = seed.trim();

    try {
      const res = await fetch(`/api/projects/${id}/caption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        console.error("Caption API error", res.status, data);
        setError(data?.error || `Caption generation failed (${res.status})`);
      } else if (data.caption) {
        setCaption(data.caption);
      }
    } catch (e) {
      console.error(e);
      setError(String(e));
    }

    setLoading(false);
  }

  async function handleGenerateHashtags() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${id}/hashtags`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        console.error("Hashtags API error", res.status, data);
        setError(data?.error || `Hashtags generation failed (${res.status})`);
      } else if (data.hashtags) {
        setHashtags(data.hashtags);
      }
    } catch (e) {
      console.error(e);
      setError(String(e));
    }

    setLoading(false);
  }

  async function handleDeleteCaption() {
    if (!caption) return;
    const ok = confirm("¿Borrar caption? Esta acción no se puede deshacer.");
    if (!ok) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${id}/caption`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        console.error("Delete caption error", res.status, data);
        setError(data?.error || `Failed to delete caption (${res.status})`);
      } else {
        setCaption(null);
      }
    } catch (e) {
      console.error(e);
      setError(String(e));
    }

    setLoading(false);
  }

  function handleGenerateFlyer() {
    setShowFlyerMenu(true);
  }

  async function handleCreateFlyer() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}/flyer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: flyerTitle,
          subtitle: flyerSubtitle,
          date: flyerDate,
          teams: flyerTeams,
          playerName: flyerPlayer,
        }),
      });

      const data = await res.json();
      if (res.status === 202 && data?.generation_id) {
        // Save generation id and start polling
        setGenerationId(data.generation_id);
        setQueuePosition(null);
        // start polling every 5s
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
          try {
            const sres = await fetch(`/api/projects/${id}/flyer/status?genId=${encodeURIComponent(data.generation_id)}`);
            const sdata = await sres.json();
            if (!sres.ok) {
              console.error("Status API error", sres.status, sdata);
              setError(sdata?.error || `Status check failed (${sres.status})`);
              // don't stop polling on transient errors
              return;
            }

            if (sdata.status === "processing") {
              setQueuePosition(typeof sdata.queue_position === "number" ? sdata.queue_position : null);
            } else if (sdata.status === "completed") {
              if (sdata.flyer_url) setFlyerUrl(sdata.flyer_url);
              setShowFlyerMenu(false);
              setQueuePosition(null);
              setGenerationId(null);
              if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
              }
              setLoading(false);
            }
          } catch (e) {
            console.error("Polling error", e);
          }
        }, 5000);
      } else {
        // immediate failure or returned url directly
        if (!res.ok) {
          console.error("Flyer API error", res.status, data);
          setError(data?.error || `Flyer generation failed (${res.status})`);
        } else if (data.flyer_url) {
          setFlyerUrl(data.flyer_url);
          setShowFlyerMenu(false);
        }
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setError(String(e));
      setLoading(false);
    }
  }

  async function saveImageUrl() {
    if (!newImageUrl.trim()) return;

    setLoading(true);

    try {
      // Update project image via Supabase client (anon key)
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supa = createClient(supabaseUrl, anonKey);

      const { error } = await supa.from("projects").update({ image_url: newImageUrl }).eq("id", id);
      if (error) {
        console.error(error);
      } else {
        setLocalImage(newImageUrl);
        setEditingImage(false);
        setNewImageUrl("");
      }
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  }

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => setEditingImage((s) => !s)} className="px-3 py-2 bg-zinc-700 text-white rounded mr-2">
          {editingImage ? "Close Image Editor" : "Edit Image"}
        </button>

        <div className="relative inline-block mr-2">
          <button
            onClick={() => setShowCaptionMenu((s) => !s)}
            className="px-3 py-2 bg-indigo-600 text-white rounded"
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate Caption"}
          </button>

          {showCaptionMenu && (
            <div className="absolute left-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded shadow-lg z-50 p-3">
              <div className="p-1 text-sm text-zinc-300">Write a starting caption or leave empty for a fresh caption</div>
              <textarea
                value={seedText}
                onChange={(e) => setSeedText(e.target.value)}
                placeholder="e.g. Great match today — proud of the team!"
                className="mt-2 w-full bg-zinc-800 p-2 rounded border border-zinc-700 text-sm text-zinc-100"
                rows={3}
              />
              <div className="mt-2 border-t border-zinc-800 pt-2 flex gap-2">
                <button
                  onClick={() => handleGenerateCaption("short", seedText)}
                  className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded"
                  disabled={loading}
                >
                  Improve / Finish (Short)
                </button>
                <button
                  onClick={() => handleGenerateCaption("long", seedText)}
                  className="flex-1 px-3 py-2 bg-indigo-500 text-white rounded"
                  disabled={loading}
                >
                  Improve / Finish (Long)
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative inline-block mr-2">
          <button onClick={() => setShowFlyerMenu((s) => !s)} className="px-3 py-2 bg-rose-600 text-white rounded" disabled={loading}>
            Generate Flyer
          </button>

          {showFlyerMenu && (
            <div className="absolute left-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded shadow-lg z-50 p-3">
              <h4 className="text-sm font-semibold text-zinc-100">Flyer Settings</h4>
              <input value={flyerTitle} onChange={(e) => setFlyerTitle(e.target.value)} placeholder="Title" className="mt-2 w-full bg-zinc-800 p-2 rounded border border-zinc-700" />
              <input value={flyerSubtitle} onChange={(e) => setFlyerSubtitle(e.target.value)} placeholder="Subtitle" className="mt-2 w-full bg-zinc-800 p-2 rounded border border-zinc-700" />
              <input value={flyerDate} onChange={(e) => setFlyerDate(e.target.value)} placeholder="Date" className="mt-2 w-full bg-zinc-800 p-2 rounded border border-zinc-700" />
              <input value={flyerTeams} onChange={(e) => setFlyerTeams(e.target.value)} placeholder="Teams (Team A vs Team B)" className="mt-2 w-full bg-zinc-800 p-2 rounded border border-zinc-700" />
              <input value={flyerPlayer} onChange={(e) => setFlyerPlayer(e.target.value)} placeholder="Player Name" className="mt-2 w-full bg-zinc-800 p-2 rounded border border-zinc-700" />

              <div className="mt-3 flex gap-2">
                <button onClick={handleCreateFlyer} disabled={loading} className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded">
                  {loading ? "Generating..." : "Generate"}
                </button>
                <button onClick={() => setShowFlyerMenu(false)} className="px-3 py-2 bg-zinc-700 text-white rounded">
                  Cancel
                </button>
              </div>
              {generationId && (
                <div className="mt-2 text-sm text-zinc-300">{
                  queuePosition !== null ? `Queue position: ${queuePosition}` : "Queued..."
                }</div>
              )}
            </div>
          )}
        </div>

        <button onClick={handleGenerateHashtags} className="px-3 py-2 bg-green-600 text-white rounded mr-2" disabled={loading}>
          Generate Hashtags
        </button>

        <div className="relative inline-block mr-2">
          <button onClick={() => setShowPromptMenu((s) => !s)} className="px-3 py-2 bg-sky-600 text-white rounded" disabled={loading}>
            Generate Prompt
          </button>

          {showPromptMenu && (
            <div className="absolute left-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded shadow-lg z-50 p-3">
              <h4 className="text-sm font-semibold text-zinc-100">Prompt Generator</h4>
              <div className="p-1 text-sm text-zinc-300">Write a few details and we'll expand them into a full image prompt.</div>
              <textarea value={promptDetails} onChange={(e) => setPromptDetails(e.target.value)} placeholder="e.g. dramatic match photo, blue tones, player celebrating" className="mt-2 w-full bg-zinc-800 p-2 rounded border border-zinc-700 text-sm text-zinc-100" rows={3} />

              <div className="mt-3 flex gap-2">
                <button onClick={async () => {
                  setGeneratedPrompt(null);
                  setLoading(true);
                  try {
                    const res = await fetch(`/api/projects/${id}/prompt`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ details: promptDetails }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      console.error("Prompt API error", res.status, data);
                      setError(data?.error || `Prompt generation failed (${res.status})`);
                    } else if (data && Object.prototype.hasOwnProperty.call(data, 'prompt')) {
                      setGeneratedPrompt(data.prompt);
                      setShowPromptMenu(true);
                    }
                  } catch (e) {
                    console.error(e);
                    setError(String(e));
                  }
                  setLoading(false);
                }} disabled={loading} className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded">Generate</button>

                <button onClick={() => { setShowPromptMenu(false); setPromptDetails(""); }} className="px-3 py-2 bg-zinc-700 text-white rounded">Close</button>
              </div>

              {generatedPrompt && (
                <div className="mt-3 bg-zinc-800 p-2 rounded text-sm text-zinc-100">
                  <div className="font-semibold mb-1">Generated Prompt</div>
                  <textarea readOnly value={generatedPrompt} className="w-full bg-zinc-800 p-2 rounded border border-zinc-700 text-sm text-zinc-100" rows={4} />
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => { navigator.clipboard.writeText(generatedPrompt); }} className="px-3 py-2 bg-green-600 text-white rounded">Copy</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {editingImage && (
        <div className="mb-4 bg-zinc-900 p-3 rounded">
          <h3 className="font-semibold mb-2">Image Editor</h3>

          {localImage ? (
            <img src={localImage} alt="project" className="w-full h-64 object-cover rounded mb-2" />
          ) : (
            <div className="w-full h-64 bg-zinc-800 rounded flex items-center justify-center text-zinc-500 mb-2">No image</div>
          )}

          <div className="flex gap-2">
            <input
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="New image URL"
              className="flex-1 bg-zinc-800 p-2 rounded border border-zinc-700"
            />
            <button onClick={saveImageUrl} className="px-3 py-2 bg-indigo-600 text-white rounded" disabled={loading}>
              Save
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-rose-900 text-rose-100 p-3 rounded">
          <h3 className="font-semibold">Error</h3>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      )}

      {caption && (
        <div className="mt-4 bg-zinc-900 p-3 rounded">
          <h3 className="font-semibold">Caption</h3>
          <p className="mt-2">{caption}</p>
          <div className="mt-2 flex gap-2">
            <button onClick={handleDeleteCaption} className="px-3 py-2 bg-rose-600 text-white rounded" disabled={loading}>
              Delete Caption
            </button>
          </div>
        </div>
      )}

      {flyerUrl && (
        <div className="mt-4 bg-zinc-900 p-3 rounded">
          <h3 className="font-semibold">Flyer</h3>
          <div className="mt-2">
            <img src={flyerUrl} alt="flyer" className="w-full h-auto rounded" />
          </div>
          <div className="mt-2 flex gap-2">
            <a href={flyerUrl} target="_blank" rel="noreferrer" className="px-3 py-2 bg-green-600 text-white rounded">
              Download Flyer
            </a>
          </div>
        </div>
      )}

      {hashtags && (
        <div className="mt-4 bg-zinc-900 p-3 rounded">
          <h3 className="font-semibold">Hashtags</h3>
          <p className="mt-2">{hashtags}</p>
        </div>
      )}
    </div>
  );
}
