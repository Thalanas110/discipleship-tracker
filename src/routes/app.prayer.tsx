import { createFileRoute } from "@tanstack/react-router";
import Prayer from "@/pages/Prayer";

export const Route = createFileRoute("/app/prayer")({
  component: Prayer,
});
