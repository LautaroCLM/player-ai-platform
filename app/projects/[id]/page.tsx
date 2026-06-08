import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import Card from "@/components/ui/card";
import ProjectActions from "@/components/ProjectActions";

type Props = {
  params: any;
};

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;

  // Use a server-side client with service role when available to bypass RLS for server rendering
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const serverClient = createClient(supabaseUrl, serviceKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const { data, error } = await serverClient.from("projects").select("*").eq("id", id).single();

  if (error || !data) {
    return (
      <main className="flex bg-black text-white min-h-screen">
        <Sidebar />
        <section className="flex-1 p-10">Project not found.</section>
      </main>
    );
  }

  return (
    <main className="flex bg-black text-white min-h-screen">
      <Sidebar />

      <section className="flex-1 p-10">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold mb-4">Project</h1>

          <Card className="p-6 bg-zinc-950/80 border-zinc-800">
            <img src={data.image_url} alt="project" className="w-full h-96 object-cover rounded mb-4" />

            <div className="text-sm text-zinc-400 mb-2">Created: {new Date(data.created_at).toLocaleString()}</div>
            <div className="text-sm text-zinc-400 mb-4">ID: {data.id}</div>

            <div className="mb-4">
              <ProjectActions id={data.id} initialCaption={data.caption} imageUrl={data.image_url} />
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
