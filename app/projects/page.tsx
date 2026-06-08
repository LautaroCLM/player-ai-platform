"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Card from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

type Project = {
  id: string;
  image_url: string;
  created_at: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setProjects(data || []);
  }

  return (
    <main className="flex bg-black text-white min-h-screen">
      <Sidebar />

      <section className="flex-1 p-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold">My Projects</h1>
            <p className="text-zinc-400 mt-2">Your uploaded player images and history.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {projects.length === 0 ? (
            <div className="text-zinc-500">No projects yet.</div>
          ) : (
            projects.map((project: Project) => (
              <div key={project.id} onClick={() => router.push(`/projects/${project.id}`)} className="cursor-pointer">
                <Card className="bg-zinc-950/80 backdrop-blur border-zinc-800 p-6 hover:shadow-lg transition">
                  <img src={project.image_url} alt="project" className="w-full h-48 object-cover mb-4 rounded" />
                  <div className="text-sm text-zinc-400">{new Date(project.created_at).toLocaleDateString()}</div>
                </Card>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
