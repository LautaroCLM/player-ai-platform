"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import UploadZone from "@/components/UploadZone";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      setEmail(data.user.email || "");
    };

    checkUser();
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <main className="flex bg-black text-white min-h-screen">
      <Sidebar />

      <section className="flex-1 p-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-sm text-zinc-400 mb-2">Logged in as {email}</p>
            <h1 className="text-4xl font-bold">Dashboard</h1>

            <p className="text-zinc-400 mt-2">Create AI football content instantly.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => router.push("/projects")} className="bg-zinc-800">Historial</Button>
            <Button onClick={logout}>Logout</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card className="bg-zinc-950/80 backdrop-blur border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-2">AI Flyers</h2>

            <p className="text-zinc-400">Generate professional matchday posters.</p>
          </Card>

          <Card className="bg-zinc-950/80 backdrop-blur border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-2">AI Captions</h2>

            <p className="text-zinc-400">Generate football social media captions.</p>
          </Card>

          <Card className="bg-zinc-950/80 backdrop-blur border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-2">Templates</h2>

            <p className="text-zinc-400">Use premium football designs instantly.</p>
          </Card>
        </div>
        {/* Upload zone placed below the cards */}
        <UploadZone />
      </section>
    </main>
  );
}