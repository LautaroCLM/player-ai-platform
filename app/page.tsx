import Sidebar from "@/components/Sidebar";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex bg-black text-white min-h-screen">
      <Sidebar />

      <section className="flex-1 p-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold">
              Dashboard
            </h1>

            <p className="text-zinc-400 mt-2">
              Create AI football content instantly.
            </p>
          </div>

          <Button>
            Upload Photo
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card className="bg-zinc-950/80 backdrop-blur border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-2">
              AI Flyers
            </h2>

            <p className="text-zinc-400">
              Generate professional matchday posters.
            </p>
          </Card>

          <Card className="bg-zinc-950/80 backdrop-blur border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-2">
              AI Captions
            </h2>

            <p className="text-zinc-400">
              Generate football social media captions.
            </p>
          </Card>

          <Card className="bg-zinc-950/80 backdrop-blur border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-2">
              Templates
            </h2>

            <p className="text-zinc-400">
              Use premium football designs instantly.
            </p>
          </Card>
        </div>
      </section>
    </main>
  );
}