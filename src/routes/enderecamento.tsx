import { createFileRoute } from "@tanstack/react-router";

import { LocationsPage } from "@/features/locations/locations-page";

export const Route = createFileRoute("/enderecamento")({
  component: LocationsPage,
});
