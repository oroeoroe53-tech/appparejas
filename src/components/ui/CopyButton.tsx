"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { t } from "@/content";
import { Button } from "./Button";

export function CopyButton({ value, label, variant = "secondary" }: { value: string; label: string; variant?: "primary" | "secondary" | "ghost" }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the value stays visible/selectable so users can copy manually.
    }
  }
  return (
    <Button variant={variant} onClick={copy} className="min-h-11 px-4">
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      <span aria-live="polite">{copied ? t.common.copied : label}</span>
    </Button>
  );
}
