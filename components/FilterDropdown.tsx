"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export interface FilterDropdownOption {
  label: string;
  value: string;
}

interface FilterDropdownProps {
  pillLabel: string;
  activeValue: string;
  activeValues?: string[];
  activeDisplayLabel: string;
  options: readonly FilterDropdownOption[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (value: string) => void;
  onClear: () => void;
  multiSelect?: boolean;
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
  activeValues,
  activeDisplayLabel,
  options,
  isOpen,
  onOpenChange,
  onSelect,
  onClear,
  multiSelect = false,
}: FilterDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);
  const isActive =
    activeValues !== undefined
      ? activeValues.length > 0
      : activeValue.length > 0;

  useLayoutEffect(() => {
    if (!isOpen || !containerRef.current) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.left,
        minWidth: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: globalThis.MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      onOpenChange(false);
    }

    // Evita fechar no mesmo clique que abriu (listener após o ciclo do click)
    const timeoutId = window.setTimeout(() => {
      document.addEventListener("mousedown", handlePointerDown);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handlePointerDown);
    };
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
            onMouseDown={(event) => event.stopPropagation()}
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
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => onOpenChange(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={cn(pillClassName, "px-4")}
        >
          {pillLabel}
          <ChevronDownIcon />
        </button>
      )}

      {isOpen && menuPosition
        ? createPortal(
            <div
              ref={dropdownRef}
              role="listbox"
              style={{
                position: "fixed",
                top: menuPosition.top,
                left: menuPosition.left,
                minWidth: Math.max(menuPosition.minWidth, 192),
              }}
              className="z-50 overflow-hidden rounded-xl border border-primary/10 bg-white py-1 shadow-md"
            >
              {options.map((option) => {
                const selected =
                  activeValues !== undefined
                    ? activeValues.includes(option.value)
                    : activeValue === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={() => {
                      onSelect(option.value);
                      if (!multiSelect) {
                        onOpenChange(false);
                      }
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
