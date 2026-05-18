import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  selected?: boolean;
}

export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ className, label, selected = false, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        aria-pressed={selected}
        className={cn(
          "inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-primary/20 bg-white text-primary hover:border-primary/40 hover:bg-primary/5",
          className,
        )}
        {...props}
      >
        {label}
      </button>
    );
  },
);

FilterChip.displayName = "FilterChip";
