import { createFileRoute } from "@tanstack/react-router";

import { WarehousePage } from "@/features/warehouse/warehouse-page";

export const Route = createFileRoute("/mapa")({
  component: WarehousePage,
});
