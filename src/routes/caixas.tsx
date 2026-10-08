import { createFileRoute } from "@tanstack/react-router";

import { BoxesPage } from "@/features/boxes/boxes-page";

export const Route = createFileRoute("/caixas")({
  component: BoxesPage,
});
