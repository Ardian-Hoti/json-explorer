"use client";

import { useCallback } from "react";
import { X } from "lucide-react";
import type { FilterDef } from "@/lib/json-utils";

const OPERATORS = [
  { value: "contains", label: "contains" },
  { value: "equals", label: "equals" },
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: "between", label: "between" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
  { value: "length_equals", label: "length =" },
  { value: "length_gt", label: "length >" },
  { value: "length_lt", label: "length <" },
];

interface FilterBarProps {
  filters: FilterDef[];
  columns: string[];
  onChange: (filters: FilterDef[]) => void;
}

export function FilterBar({ filters, columns, onChange }: FilterBarProps) {
  const update = useCallback(
    (id: string, patch: Partial<FilterDef>) => {
      onChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    },
    [filters, onChange]
  );

  const remove = useCallback(
    (id: string) => {
      onChange(filters.filter((f) => f.id !== id));
    },
    [filters, onChange]
  );

  if (filters.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-card/50 px-3 py-2">
      {filters.map((filter) => (
        <div key={filter.id} className="flex flex-wrap items-center gap-2">
          <select
            value={filter.field}
            onChange={(e) => update(filter.id, { field: e.target.value })}
            className="rounded-md border border-border bg-input px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {columns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filter.operator}
            onChange={(e) => update(filter.id, { operator: e.target.value })}
            className="rounded-md border border-border bg-input px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>

          {!["is_empty", "is_not_empty"].includes(filter.operator) && (
            <input
              type="text"
              value={filter.val1}
              onChange={(e) => update(filter.id, { val1: e.target.value })}
              placeholder="value"
              className="w-28 rounded-md border border-border bg-input px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}

          {filter.operator === "between" && (
            <input
              type="text"
              value={filter.val2}
              onChange={(e) => update(filter.id, { val2: e.target.value })}
              placeholder="to"
              className="w-28 rounded-md border border-border bg-input px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}

          <button
            onClick={() => remove(filter.id)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
            aria-label="Remove filter"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
