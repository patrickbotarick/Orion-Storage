import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/components/ui/class-names";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-card border border-line bg-surface p-4", className)} {...props} />
  );
}

export function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: ReactNode;
  description?: string;
}) {
  return (
    <Card>
      <dl>
        <dt className="text-metadata font-medium text-muted">{label}</dt>
        <dd className="mt-2 text-stat font-bold tabular-nums">{value}</dd>
      </dl>
      {description ? <p className="mt-2 text-metadata text-muted">{description}</p> : null}
    </Card>
  );
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="orion-page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-medium tracking-wide text-muted uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="text-heading-1 font-bold">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex max-w-full shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function TableToolbar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-3", className)} {...props} />;
}

// Native composition; sorting, rows, filters and mobile alternatives remain caller-owned.
export function DataTable({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn("overflow-x-auto rounded-card border border-line bg-surface", className)}
    >
      <table className="w-full min-w-max border-collapse text-left text-sm [&_th]:bg-bg [&_th]:text-muted [&_tr[aria-selected=true]]:bg-selected">
        <caption className="sr-only">{label}</caption>
        {children}
      </table>
    </div>
  );
}

export function BoxCode({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("font-mono text-code font-medium", className)} {...props} />;
}

export function LocationCode(props: HTMLAttributes<HTMLSpanElement>) {
  return <BoxCode {...props} />;
}
