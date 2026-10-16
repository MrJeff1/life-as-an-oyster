import { createFileRoute } from "@tanstack/react-router";
import { OysterGame } from "@/components/OysterGame";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <OysterGame />;
}
