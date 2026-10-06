import { createFileRoute } from "@tanstack/react-router";

import { ReceiptsPage } from "@/features/receipts/receipts-page";

export const Route = createFileRoute("/recebimentos")({
  component: ReceiptsPage,
});
