import {
  LayoutDashboard,
  ImageIcon,
  Sparkles,
  Settings,
} from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 min-h-screen p-6">
      <h2 className="text-2xl font-bold text-white mb-10">PlayerAI</h2>

      <nav className="space-y-4">
        <div className="flex items-center gap-3 text-zinc-300 hover:text-white cursor-pointer">
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </div>

        <div className="flex items-center gap-3 text-zinc-300 hover:text-white cursor-pointer">
          <ImageIcon size={20} />
          <span>Generate Flyer</span>
        </div>

        <div className="flex items-center gap-3 text-zinc-300 hover:text-white cursor-pointer">
          <Sparkles size={20} />
          <span>AI Captions</span>
        </div>

        <div className="flex items-center gap-3 text-zinc-300 hover:text-white cursor-pointer">
          <Settings size={20} />
          <span>Settings</span>
        </div>
      </nav>
    </aside>
  );
}
