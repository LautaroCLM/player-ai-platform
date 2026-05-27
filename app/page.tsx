import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-5xl font-bold">
        Player AI Platform
      </h1>

      <Button>
        Upload Photo
      </Button>
    </main>
  );
}