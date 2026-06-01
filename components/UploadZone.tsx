"use client";

import { Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { uploadImage } from "@/lib/storage";
import { createProject } from "@/lib/projects";
import { supabase } from "@/lib/supabase";

export default function UploadZone() {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleImage = async (file: File) => {
    if (!file) return;

    try {
      const imageUrl = await uploadImage(file);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log("USER:", user);
      console.log("USER ID:", user?.id);
      console.log("IMAGE URL:", imageUrl);

      if (!user) {
        alert("User not logged in");
        return;
      }

      await createProject(user.id, imageUrl);

      setPreview(imageUrl);
    } catch (err) {
      // fallback to local preview on any error
      if (preview) URL.revokeObjectURL(preview);
      const imageUrl = URL.createObjectURL(file);
      setPreview(imageUrl);
      console.error("Upload / save failed:", err);
      alert("Upload failed, showing local preview. Check console for details.");
    }
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImage(file);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImage(file);
  };

  const clear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="mt-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex items-center justify-center flex-col gap-3 p-6 rounded-xl border-2 transition-shadow duration-200 cursor-pointer select-none overflow-hidden ${
          dragActive
            ? "border-primary bg-zinc-900/60 shadow-lg"
            : "border-zinc-800 bg-zinc-950/60 hover:shadow-xl"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onChange}
        />

        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className="max-h-56 w-auto rounded-md object-cover"
            />

            <button
              onClick={clear}
              className="absolute top-3 right-3 bg-black/60 text-zinc-200 p-1 rounded-md hover:bg-black/70"
              title="Remove photo"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 text-zinc-300">
              <div className="p-2 rounded-md bg-zinc-800/40">
                <Upload size={28} />
              </div>

              <div className="text-left">
                <div className="text-white font-semibold">Upload Player Photo</div>
                <div className="text-zinc-400 text-sm">Drag and drop or click to upload</div>
              </div>
            </div>

            <div className="mt-2 text-xs text-zinc-500">PNG, JPG — max 5MB</div>
          </>
        )}
      </div>
    </div>
  );
}
