import { forwardRef, type ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/components/ui/class-names";

const VARIANTS = {
  primary: "border border-accent bg-accent text-accent-fg enabled:hover:bg-accent-hover",
  secondary: "border border-control-border bg-surface text-ink enabled:hover:bg-bg",
  ghost: "border border-transparent bg-transparent text-ink enabled:hover:bg-bg",
  danger: "border border-danger-border bg-danger-bg text-danger enabled:hover:bg-danger-bg/70",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  loading?: boolean;
  selected?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    className,
    type = "button",
    loading = false,
    selected,
    disabled,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex min-h-11 min-w-0 max-w-full items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:border-disabled-border disabled:bg-disabled-bg disabled:text-disabled",
        VARIANTS[variant],
        selected && "border-accent bg-selected text-selected-fg enabled:hover:bg-selected",
        className,
      )}
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-pressed={selected ?? props["aria-pressed"]}
    >
      {loading ? (
        <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonProps & { "aria-label": string }>(
  function IconButton({ className, ...props }, ref) {
    return <Button ref={ref} className={cn("min-w-11 shrink-0 px-2", className)} {...props} />;
  },
);
