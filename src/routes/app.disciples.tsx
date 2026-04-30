import { createFileRoute } from "@tanstack/react-router";
import Disciples from "@/pages/Disciples";

export const Route = createFileRoute("/app/disciples")({
  component: Disciples,
});
