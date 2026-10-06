import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, required, hint, error, children }: FieldProps) {
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
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const controlClass =
  "min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-muted focus:border-ink";
