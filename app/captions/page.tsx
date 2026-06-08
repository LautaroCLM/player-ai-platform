import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function CaptionsPage() {
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Historial de fotos</h1>

      <p className="text-zinc-400 mb-6">Selecciona una foto para abrir el proyecto y generar un caption guardado.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {projects && projects.length > 0 ? (
          projects.map((p: any) => (
            <div key={p.id} className="bg-zinc-900 p-4 rounded">
              <img src={p.image_url} alt="project" className="h-48 w-full object-cover rounded" />

              <div className="mt-2 text-sm text-zinc-400">{new Date(p.created_at).toLocaleString()}</div>

              <div className="mt-3 flex items-center justify-between">
                <Link href={`/projects/${p.id}`} className="px-3 py-2 bg-indigo-600 rounded text-white">
                  Abrir proyecto
                </Link>

                {p.caption ? (
                  <span className="text-sm text-zinc-300">Caption guardado</span>
                ) : (
                  <span className="text-sm text-zinc-500">Sin caption</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-zinc-400">No hay proyectos aún. Sube una foto desde el Dashboard.</div>
        )}
      </div>
    </div>
  );
}
