import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm shadow-brand-600/30 hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/40 disabled:opacity-50 disabled:shadow-none dark:bg-brand-500 dark:hover:bg-brand-400",
  secondary:
    "border border-zinc-300 text-zinc-700 hover:border-brand-500 hover:text-brand-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-brand-400 dark:hover:text-brand-400",
  danger: "text-critical hover:bg-critical/10 disabled:opacity-50",
  ghost: "text-zinc-500 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-900",
};

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all active:scale-[0.98] ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
