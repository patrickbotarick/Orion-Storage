import { createFileRoute } from "@tanstack/react-router";
import { InventoriesPage } from "@/features/inventories/inventories-page";

export const Route = createFileRoute("/inventarios")({ component: InventoriesPage });
