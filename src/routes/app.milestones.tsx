import { createFileRoute } from "@tanstack/react-router";
import Milestones from "@/pages/Milestones";

export const Route = createFileRoute("/app/milestones")({
  component: Milestones,
});
