"use client";

import { X, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";

interface DetailPanelProps {
  item: Record<string, unknown> | null;
  onClose: () => void;
}

export function DetailPanel({ item, onClose }: DetailPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!item) return;
    navigator.clipboard.writeText(JSON.stringify(item, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [item]);

  if (!item) return null;

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          Detail View
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Copy JSON"
          >
            {copied ? (
              <Check className="size-3.5 text-green-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close panel"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/90">
          {JSON.stringify(item, null, 2)}
        </pre>
      </div>
    </div>
  );
}
