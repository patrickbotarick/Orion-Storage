import { Children, cloneElement, isValidElement, type AriaAttributes, type ReactNode } from "react";

type FieldProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, required, hint, error, children }: FieldProps) {
  const controls = Children.map(children, (child) => {
    if (!isValidElement<{ id?: string } & AriaAttributes>(child) || child.props.id !== htmlFor)
      return child;
    if (typeof child.type === "string" && !["input", "select", "textarea"].includes(child.type))
      return child;
    const descriptions = new Set([
      ...(child.props["aria-describedby"]?.split(/\s+/).filter(Boolean) ?? []),
      ...(hint ? [`${htmlFor}-hint`] : []),
      ...(error ? [`${htmlFor}-error`] : []),
    ]);
    return cloneElement(child, {
      "aria-describedby": [...descriptions].join(" ") || undefined,
      "aria-invalid": error ? true : child.props["aria-invalid"],
      "aria-required": required || child.props["aria-required"],
    });
  });
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="text-accent" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {controls}
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-metadata text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-metadata text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const controlClass =
  "min-h-11 w-full rounded-control border border-control-border bg-surface px-3 py-2 text-sm text-ink transition-colors duration-150 placeholder:text-muted enabled:hover:border-accent focus-visible:border-accent disabled:cursor-not-allowed disabled:border-disabled-border disabled:bg-disabled-bg disabled:text-disabled aria-[invalid=true]:border-danger-border aria-[invalid=true]:bg-danger-bg";
