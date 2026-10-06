import { forwardRef, type ButtonHTMLAttributes } from "react";

const VARIANTS = {
  primary: "bg-accent text-accent-fg hover:bg-ink",
  secondary: "border border-line bg-surface text-ink hover:border-ink",
  ghost: "bg-transparent text-ink hover:bg-bg",
  danger: "border border-line bg-surface text-danger hover:border-danger",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", className = "", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
});
