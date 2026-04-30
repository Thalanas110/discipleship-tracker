import { createFileRoute } from "@tanstack/react-router";
import FollowUps from "@/pages/FollowUps";

export const Route = createFileRoute("/app/follow-ups")({
  component: FollowUps,
});
