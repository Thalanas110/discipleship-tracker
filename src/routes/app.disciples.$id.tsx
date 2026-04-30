import { createFileRoute } from "@tanstack/react-router";
import DiscipleProfile from "@/pages/DiscipleProfile";

export const Route = createFileRoute("/app/disciples/$id")({
  component: DiscipleProfile,
});
