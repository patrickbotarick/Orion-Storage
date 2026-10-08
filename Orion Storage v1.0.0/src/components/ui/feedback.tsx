import type { HTMLAttributes, ReactNode } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Info,
  LoaderCircle,
  PackageOpen,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/components/ui/class-names";

const TONES = {
  neutral: "border-line bg-bg text-muted",
  success: "border-success-border bg-success-bg text-success",
  warning: "border-warning-border bg-warning-bg text-warning",
  danger: "border-danger-border bg-danger-bg text-danger",
  info: "border-info-border bg-info-bg text-info",
} as const;
export type Tone = keyof typeof TONES;
const ICONS = {
  neutral: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: CircleAlert,
  info: Info,
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1 rounded-control border px-2 py-1 text-xs font-semibold",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

export function StatusIndicator({
  tone = "neutral",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  const Icon = ICONS[tone];
  return (
    <Badge tone={tone} {...props}>
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {children}
    </Badge>
  );
}

export function Alert({
  tone = "info",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone }) {
  const Icon = ICONS[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-control border p-4 text-sm",
        TONES[tone],
        className,
      )}
      {...props}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// Presentation only: callers retain the existing notification lifetime/flow.
export function Toast(props: Parameters<typeof Alert>[0]) {
  return <Alert {...props} />;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-control-border bg-surface px-6 py-12 text-center">
      <PackageOpen className="mx-auto mb-4 size-6 text-muted" aria-hidden="true" />
      <p className="text-base font-semibold">{title}</p>
      {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingState({
  label = "Carregando…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <p role="status" className={cn("flex items-center gap-2 py-4 text-sm text-muted", className)}>
      <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      {label}
    </p>
  );
}
