"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ImageIcon, Settings } from "lucide-react";

export default function Sidebar() {
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hideImages, setHideImages] = useState(false);

  useEffect(() => {
    try {
      const storedTheme = (localStorage.getItem("theme") as "dark" | "light") || null;
      const rm = localStorage.getItem("reducedMotion") === "1";
      const hi = localStorage.getItem("hideImages") === "1";

      if (storedTheme) setTheme(storedTheme);
      setReducedMotion(rm);
      setHideImages(hi);
    } catch (e) {
      // ignore
    }

    // ensure dark default if nothing stored
    if (!localStorage.getItem("theme")) {
      setTheme("dark");
      try { localStorage.setItem("theme", "dark"); } catch {}
    }
  }, []);

  useEffect(() => {
    // apply theme class to root: default is light, add/remove `.dark` for dark mode
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");

    // reduced motion
    if (reducedMotion) document.documentElement.classList.add("reduced-motion");
    else document.documentElement.classList.remove("reduced-motion");

    // hide images
    if (hideImages) document.documentElement.classList.add("hide-images");
    else document.documentElement.classList.remove("hide-images");

    try {
      localStorage.setItem("theme", theme);
      localStorage.setItem("reducedMotion", reducedMotion ? "1" : "0");
      localStorage.setItem("hideImages", hideImages ? "1" : "0");
    } catch (e) {
      // ignore
    }
  }, [theme, reducedMotion, hideImages]);

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 min-h-screen p-6">
      <h2 className="text-2xl font-bold text-white mb-10">PlayerAI</h2>

      <nav className="space-y-4">
        <div
          onClick={() => router.push("/")}
          className="flex items-center gap-3 text-zinc-300 hover:text-white cursor-pointer"
          role="button"
          tabIndex={0}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </div>

        <div
          onClick={() => router.push("/projects")}
          className="flex items-center gap-3 text-zinc-300 hover:text-white cursor-pointer"
          role="button"
          tabIndex={0}
        >
          <ImageIcon size={20} />
          <span>Projects</span>
        </div>

        {/* Settings menu */}
        <div className="relative">
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="flex items-center gap-3 text-zinc-300 hover:text-white cursor-pointer"
            aria-expanded={showSettings}
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>

          {showSettings && (
            <div className="mt-2 p-3 w-56 bg-zinc-900 border border-zinc-800 rounded shadow-lg">
              <div className="mb-2 text-sm text-zinc-300">Theme</div>
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => setTheme("dark")} className={`px-2 py-1 rounded ${theme === "dark" ? "bg-zinc-700 text-white" : "bg-zinc-800 text-zinc-300"}`}>Dark</button>
                <button onClick={() => setTheme("light")} className={`px-2 py-1 rounded ${theme === "light" ? "bg-zinc-700 text-white" : "bg-zinc-800 text-zinc-300"}`}>Light</button>
              </div>

              <label className="flex items-center gap-2 text-sm text-zinc-300 mb-2">
                <input type="checkbox" checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} />
                Reduce motion
              </label>

              <label className="flex items-center gap-2 text-sm text-zinc-300 mb-2">
                <input type="checkbox" checked={hideImages} onChange={(e) => setHideImages(e.target.checked)} />
                Hide images
              </label>

              <div className="mt-3 flex gap-2">
                <button onClick={() => setShowSettings(false)} className="flex-1 px-2 py-1 bg-zinc-700 text-white rounded">Close</button>
              </div>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
