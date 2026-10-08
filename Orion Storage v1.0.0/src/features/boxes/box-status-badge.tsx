import { BOX_STATUS_LABEL, type BoxStatus } from "@orion/domain";
import { StatusIndicator, type Tone } from "@/components/ui/feedback";

const STATUS_TONE: Record<BoxStatus, Tone> = {
  RECEIVED: "info",
  AVAILABLE: "success",
  OPENED: "warning",
  EMPTY: "neutral",
  BLOCKED: "danger",
};

export function BoxStatusBadge({ status }: { status: BoxStatus }) {
  return (
    <StatusIndicator tone={STATUS_TONE[status]} className="whitespace-nowrap">
      {BOX_STATUS_LABEL[status]}
    </StatusIndicator>
  );
}
