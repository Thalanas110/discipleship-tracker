import { createFileRoute } from "@tanstack/react-router";
import Habits from "@/pages/Habits";

export const Route = createFileRoute("/app/habits")({
  component: Habits,
});
