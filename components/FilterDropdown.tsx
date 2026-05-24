"use client";

import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { cn } from "@/lib/cn";

export interface FilterDropdownOption {
  label: string;
  value: string;
}

interface FilterDropdownProps {
  pillLabel: string;
  activeValue: string;
  activeDisplayLabel: string;
  options: readonly FilterDropdownOption[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (value: string) => void;
  onClear: () => void;
}

function ChevronDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="size-4 shrink-0 opacity-70"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="size-4 shrink-0"
      aria-hidden
    >
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

export function FilterDropdown({
  pillLabel,
  activeValue,
  activeDisplayLabel,
  options,
  isOpen,
  onOpenChange,
  onSelect,
  onClear,
}: FilterDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isActive = activeValue.length > 0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: globalThis.MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen, onOpenChange]);

  const handleClearClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClear();
    onOpenChange(false);
  };

  const pillClassName = cn(
    "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border text-sm font-medium transition-colors",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    isActive
      ? "border-primary/30 bg-primary/10 text-primary"
      : "border-primary/20 bg-white text-primary hover:border-primary/40 hover:bg-primary/5",
  );

  return (
    <div ref={containerRef} className="relative shrink-0">
      {isActive ? (
        <div className={cn(pillClassName, "pr-1 pl-4")}>
          <button
            type="button"
            onClick={() => onOpenChange(!isOpen)}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            className="inline-flex items-center gap-1.5 py-2 focus-visible:outline-none"
          >
            {activeDisplayLabel}
          </button>
          <button
            type="button"
            onClick={handleClearClick}
            className="inline-flex rounded-full p-1.5 hover:bg-primary/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={`Remover filtro ${pillLabel}`}
          >
            <CloseIcon />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpenChange(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={cn(pillClassName, "px-4")}
        >
          {pillLabel}
          <ChevronDownIcon />
        </button>
      )}

      {isOpen ? (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-50 min-w-[12rem] overflow-hidden rounded-xl border border-primary/10 bg-white py-1 shadow-md"
        >
          {options.map((option) => {
            const selected = activeValue === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onSelect(option.value);
                  onOpenChange(false);
                }}
                className={cn(
                  "flex w-full px-4 py-2.5 text-left text-sm transition-colors",
                  selected
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-primary hover:bg-primary/5",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
