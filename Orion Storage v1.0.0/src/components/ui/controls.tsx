import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Search } from "lucide-react";
import { cn } from "@/components/ui/class-names";
import { controlClass } from "@/components/ui/field";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlClass, className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(controlClass, className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea ref={ref} className={cn(controlClass, "min-h-24 resize-y", className)} {...props} />
  );
});

export const SearchInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(function SearchInput({ className, ...props }, ref) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <Input ref={ref} type="search" className={cn("pl-10", className)} {...props} />
    </div>
  );
});
