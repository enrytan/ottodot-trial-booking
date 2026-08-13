"use client";

import { useFormStatus } from "react-dom";

const VARIANTS = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-hover",
  success: "bg-emerald-600 text-white hover:bg-emerald-500",
  danger: "bg-red-600 text-white hover:bg-red-500",
} as const;

// `disabled:hover:` needs pinning too: two pseudo-classes out-specify one, so
// without it hovering a disabled button restores its active colour.
const DISABLED =
  "disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-muted disabled:shadow-none disabled:hover:bg-surface-raised";

/**
 * Its own Client Component so the surrounding pages and forms stay Server
 * Components -- useFormStatus only needs to run on the button.
 *
 * Convenience, not protection: the unique index and confirm_booking's status
 * guard are what actually prevent duplicates.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  disabled = false,
  className = "",
  ...rest
}: React.ComponentProps<"button"> & {
  pendingLabel?: string;
  variant?: keyof typeof VARIANTS;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-medium shadow-sm transition-colors ${VARIANTS[variant]} ${DISABLED} ${className}`}
      {...rest}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
