import { AppHeader } from "@/components/app-header";
import { Assistant } from "./assistant";

export default function Home() {
  return (
    <main className="flex h-dvh flex-col">
      <AppHeader />
      <div className="min-h-0 flex-1">
        <Assistant />
      </div>
    </main>
  );
}
