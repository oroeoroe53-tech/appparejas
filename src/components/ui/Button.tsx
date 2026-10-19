import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100";

const variants: Record<Variant, string> = {
  primary: "bg-cherry text-on-cherry shadow-soft hover:bg-cherry-deep",
  secondary: "border border-line bg-paper text-ink hover:border-stone",
  ghost: "text-cherry hover:bg-rose-soft",
  danger: "border border-cherry/40 text-cherry hover:bg-rose-soft",
};

export function buttonClass(variant: Variant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
