import { BOX_STATUS_LABEL, type BoxStatus } from "@orion/domain";

const STATUS_CLASS: Record<BoxStatus, string> = {
  RECEIVED: "border border-line bg-bg text-ink",
  AVAILABLE: "bg-ink text-on-ink",
  OPENED: "bg-accent text-accent-fg",
  EMPTY: "border border-line bg-bg text-muted",
  BLOCKED: "border border-danger bg-surface text-danger",
};

export function BoxStatusBadge({ status }: { status: BoxStatus }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-md px-2 text-xs font-medium whitespace-nowrap ${STATUS_CLASS[status]}`}
    >
      {BOX_STATUS_LABEL[status]}
    </span>
  );
}
