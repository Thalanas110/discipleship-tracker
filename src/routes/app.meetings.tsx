import { createFileRoute } from "@tanstack/react-router";
import Meetings from "@/pages/Meetings";

export const Route = createFileRoute("/app/meetings")({
  component: Meetings,
});
