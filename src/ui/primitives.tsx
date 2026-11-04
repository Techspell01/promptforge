"use client";

import { Check, ChevronDown, Info, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium tracking-[-0.005em] transition-[background-color,border-color,opacity,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45";

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] rounded-lg",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
};

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-inverse text-inverse-ink shadow-pill hover:opacity-90",
  secondary: "border border-line-strong bg-card text-ink hover:border-control hover:bg-hover",
  ghost: "text-muted hover:bg-hover hover:text-ink",
};

export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md"): string {
  return `${BUTTON_BASE} ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]}`;
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={`${buttonClasses(variant, size)} ${className}`} {...props} />;
}

const CONTROL =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 text-base text-ink md:text-sm transition-[border-color,background-color] duration-150 placeholder:text-muted hover:border-control focus-visible:border-control focus-visible:bg-card disabled:opacity-45";

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CONTROL} h-10 ${className}`} {...props} />;
}

export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${CONTROL} py-2.5 leading-6 ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={`${CONTROL} h-10 cursor-pointer appearance-none pr-9 ${className}`} {...props}>
        {children}
      </select>
      <ChevronDown
        size={16}
        strokeWidth={1.75}
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        {hint ? <span className="font-mono text-[11px] text-muted tabular-nums">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

/** Label for a group of controls that are not a single form field. */
export function GroupLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-4">
      <span className="text-[13px] font-medium text-ink">{children}</span>
      {hint ? <span className="font-mono text-[11px] text-muted tabular-nums">{hint}</span> : null}
    </div>
  );
}

/** iOS-style track: the selected option is a raised pill, not a colour. */
export function Segmented<Value extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-line bg-surface p-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              onChange(option.value);
            }}
            className={`h-8 min-w-0 whitespace-nowrap rounded-lg px-2 text-[13px] font-medium transition-[background-color,color] duration-150 ${
              selected ? "bg-raised text-ink shadow-pill" : "text-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Card({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-2xl border border-line bg-card shadow-soft ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[12px] font-medium text-muted ${className}`}
    >
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line-strong bg-surface px-1 font-mono text-[11px] text-muted">
      {children}
    </kbd>
  );
}

/** Monochrome indeterminate progress line instead of a spinner. */
export function ProgressLine({ label }: { label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      className="relative h-0.5 w-full overflow-hidden rounded-full bg-line"
    >
      <div className="progress-line absolute inset-y-0 left-0 w-2/5 rounded-full bg-ink" />
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton-pulse rounded-lg bg-skeleton ${className}`} />;
}

export function Rule() {
  return <hr className="border-0 border-t border-line" />;
}

export function EmptyState({
  title,
  detail,
  icon,
  children,
}: {
  title: string;
  detail: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      {icon ? (
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface text-ink shadow-soft">
          {icon}
        </div>
      ) : null}
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      <p className="mt-2 max-w-[44ch] text-sm leading-6 text-muted">{detail}</p>
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}

export function Notice({ children, role = "status" }: { children: ReactNode; role?: "status" | "alert" }) {
  return (
    <div
      role={role}
      className="rise-in flex items-start gap-3 rounded-xl border border-line-strong bg-surface px-3.5 py-3 text-sm leading-6"
    >
      <Info size={16} strokeWidth={1.75} aria-hidden className="mt-1 shrink-0 text-muted" />
      <p>{children}</p>
    </div>
  );
}

/**
 * Bottom sheet on phones, centred dialog on larger screens. Built on <dialog> for focus trapping and Esc.
 * Children mount only while open, so closed sheets add nothing to the page.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      className="sheet"
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog element itself (not its content) is a click on the backdrop.
        if (event.target === ref.current) onClose();
      }}
    >
      {open ? (
        <div className="flex max-h-[88dvh] flex-col md:max-h-[80dvh]">
          <div
            className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong md:hidden"
            aria-hidden
          />
          <div className="flex shrink-0 items-center justify-between gap-4 px-5 pb-3 pt-3 md:pt-5">
            <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted transition-colors duration-150 hover:text-ink"
            >
              <X size={16} strokeWidth={2} aria-hidden />
            </button>
          </div>
          <div className="scrollbar-quiet min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          {footer ? (
            <div className="shrink-0 border-t border-line px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              {footer}
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}

/** Short-lived confirmation that floats above the action bar. */
export function Toast({ message }: { message: string | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+9.5rem)] z-40 flex justify-center px-4 md:bottom-10"
    >
      {message ? (
        <p className="toast-in flex items-center gap-2 rounded-full bg-inverse px-4 py-2.5 text-[13px] font-medium text-inverse-ink shadow-lift">
          <Check size={14} strokeWidth={2.25} aria-hidden />
          {message}
        </p>
      ) : null}
    </div>
  );
}

/** Shows a message for a moment, then clears it. */
export function useToast(): [string | null, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const show = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => {
      setMessage(null);
    }, 2400);
  }, []);
  return [message, show];
}
