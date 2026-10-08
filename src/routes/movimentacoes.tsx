import { createFileRoute } from "@tanstack/react-router";

import { MovementsPage } from "@/features/movements/movements-page";

export const Route = createFileRoute("/movimentacoes")({
  component: MovementsPage,
});
