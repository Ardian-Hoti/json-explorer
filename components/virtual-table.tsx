"use client";

import { useRef, useCallback, useMemo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getValues, type SortConfig } from "@/lib/json-utils";
import {
	ArrowUp,
	ArrowDown,
	ArrowUpDown,
	ExternalLink,
	Copy,
	Check,
} from "lucide-react";

interface VirtualTableProps {
	data: Record<string, unknown>[];
	columns: string[];
	sort: SortConfig | null;
	onSort: (field: string) => void;
	selectedItem: Record<string, unknown> | null;
	onOpenDetail: (item: Record<string, unknown>) => void;
	selectedRows: Set<number>;
	onToggleRow: (index: number) => void;
	onToggleAll: () => void;
}

function formatCellValue(val: unknown): string {
	if (val == null) return "";
	if (typeof val === "boolean") return val ? "true" : "false";
	if (typeof val === "number") return String(val);
	if (typeof val === "string") return val;
	if (Array.isArray(val)) {
		if (val.length === 0) return "[]";
		if (val.every((v) => typeof v !== "object" || v === null))
			return val.join(", ");
		return `[${val.length} items]`;
	}
	if (typeof val === "object") {
		const keys = Object.keys(val as Record<string, unknown>);
		if (keys.length <= 3) {
			return keys
				.map(
					(k) =>
						`${k}: ${formatCellValue((val as Record<string, unknown>)[k])}`,
				)
				.join(", ");
		}
		return `{${keys.length} fields}`;
	}
	return String(val);
}

function formatColumnHeader(col: string): { prefix: string; name: string } {
	const parts = col.split(".");
	if (parts.length === 1) return { prefix: "", name: parts[0] };
	return {
		prefix: parts.slice(0, -1).join("."),
		name: parts[parts.length - 1],
	};
}

function isUrl(s: string): boolean {
	return /^https?:\/\//i.test(s);
}

// Cell value popup
function CellPopup({
	value,
	field,
	position,
	onClose,
}: {
	value: string;
	field: string;
	position: { top: number; left: number };
	onClose: () => void;
}) {
	const [copied, setCopied] = useState(false);
	const isLong = value.length > 80 || value.includes("\n");
	const isLink = isUrl(value);

	const handleCopy = () => {
		navigator.clipboard.writeText(value);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<>
			<div className="fixed inset-0 z-40" onClick={onClose} />
			<div
				className="fixed z-50 flex max-w-md flex-col gap-1.5 rounded-lg border border-border bg-card p-2.5 shadow-xl"
				style={{
					top: Math.min(position.top, window.innerHeight - 240),
					left: Math.min(position.left, window.innerWidth - 340),
				}}
			>
				<div className="flex items-center justify-between gap-2">
					<span className="truncate font-mono text-[10px] text-muted-foreground">
						{field}
					</span>
					<div className="flex items-center gap-1">
						{isLink && (
							<a
								href={value}
								target="_blank"
								rel="noopener noreferrer"
								className="rounded p-0.5 text-primary transition-colors hover:bg-primary/10"
								title="Open link"
							>
								<ExternalLink className="size-3" />
							</a>
						)}
						<button
							onClick={handleCopy}
							className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
							title="Copy value"
						>
							{copied ? (
								<Check className="size-3 text-green-400" />
							) : (
								<Copy className="size-3" />
							)}
						</button>
					</div>
				</div>
				{isLong ? (
					<textarea
						readOnly
						value={value}
						className="h-32 w-full resize-y rounded border border-border bg-input p-2 font-mono text-xs text-foreground focus:outline-none"
						onFocus={(e) => e.target.select()}
					/>
				) : (
					<div className="select-all rounded bg-input px-2 py-1 font-mono text-xs text-foreground break-all">
						{value}
					</div>
				)}
			</div>
		</>
	);
}

export function VirtualTable({
	data,
	columns,
	sort,
	onSort,
	onOpenDetail,
	selectedRows,
	onToggleRow,
	onToggleAll,
}: VirtualTableProps) {
	const parentRef = useRef<HTMLDivElement>(null);
	const [activeCell, setActiveCell] = useState<{
		value: string;
		field: string;
		position: { top: number; left: number };
	} | null>(null);

	const visibleCols = useMemo(() => columns.slice(0, 20), [columns]);

	const rowVirtualizer = useVirtualizer({
		count: data.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 36,
		overscan: 20,
	});

	const allSelected = data.length > 0 && selectedRows.size === data.length;
	const someSelected = selectedRows.size > 0 && !allSelected;

	const handleCellClick = useCallback(
		(
			e: React.MouseEvent<HTMLTableCellElement>,
			field: string,
			displayValue: string,
		) => {
			if (!displayValue) return;
			const rect = e.currentTarget.getBoundingClientRect();
			setActiveCell({
				value: displayValue,
				field,
				position: { top: rect.bottom + 4, left: rect.left },
			});
		},
		[],
	);

	return (
		<div ref={parentRef} className="h-full overflow-auto">
			{activeCell && (
				<CellPopup
					value={activeCell.value}
					field={activeCell.field}
					position={activeCell.position}
					onClose={() => setActiveCell(null)}
				/>
			)}
			<table className="w-full border-collapse font-mono text-sm">
				<thead className="sticky top-0 z-10 ">
					<tr>
						{/* Checkbox header */}
						<th className="w-10 border-b border-border px-2 py-2 text-center">
							<input
								type="checkbox"
								checked={allSelected}
								ref={(el) => {
									if (el) el.indeterminate = someSelected;
								}}
								onChange={onToggleAll}
								className="size-3.5 cursor-pointer accent-primary"
							/>
						</th>
						{/* Detail button header */}
						<th className="w-8 border-b border-border" />
						{visibleCols.map((col) => {
							const isActive = sort?.field === col;
							const { prefix, name } = formatColumnHeader(col);
							return (
								<th
									key={col}
									onClick={() => onSort(col)}
									className="cursor-pointer select-none border-b border-border px-3 py-2  text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground  "
								>
									<span className="inline-flex items-center gap-1.5">
										<span className="flex max-w-45 flex-col truncate">
											{prefix && (
												<span className="text-[12px] text-muted-foreground/50">
													{prefix}
												</span>
											)}
											<span>{name}</span>
										</span>
										{isActive ? (
											sort.direction === "asc" ? (
												<ArrowUp className="size-3 shrink-0 text-primary" />
											) : (
												<ArrowDown className="size-3 shrink-0 text-primary" />
											)
										) : (
											<ArrowUpDown className="size-3 shrink-0 opacity-30" />
										)}
									</span>
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					<tr
						style={{
							height: rowVirtualizer.getVirtualItems()[0]?.start ?? 0,
						}}
					>
						<td colSpan={visibleCols.length + 2} />
					</tr>
					{rowVirtualizer.getVirtualItems().map((virtualRow) => {
						const item = data[virtualRow.index];
						const isChecked = selectedRows.has(virtualRow.index);
						return (
							<tr
								key={virtualRow.index}
								data-index={virtualRow.index}
								className={`border-b border-border/50 transition-colors ${
									isChecked ? "bg-primary/5" : "hover:bg-secondary/30"
								}`}
								style={{ height: virtualRow.size }}
							>
								{/* Checkbox */}
								<td className="px-2 text-center">
									<input
										type="checkbox"
										checked={isChecked}
										onChange={() => onToggleRow(virtualRow.index)}
										className="size-3.5 cursor-pointer accent-primary"
									/>
								</td>
								{/* Detail icon */}
								<td className="px-1 text-center">
									<button
										onClick={() => onOpenDetail(item)}
										className="rounded p-1 text-muted-foreground/50 transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
										title="View full record"
									>
										<ExternalLink className="size-4" />
									</button>
								</td>
								{visibleCols.map((col) => {
									const vals = getValues(item, col);
									const display =
										vals.length > 1
											? vals
													.map((v) => formatCellValue(v))
													.join(", ")
											: formatCellValue(vals[0]);
									const isLink =
										typeof vals[0] === "string" &&
										isUrl(vals[0] as string);
									return (
										<td
											key={col}
											onClick={(e) =>
												handleCellClick(e, col, display)
											}
											className={`max-w-55 cursor-pointer truncate px-3 py-1.5 text-sm transition-colors hover:bg-secondary/40 ${
												isLink
													? "text-primary underline decoration-primary/30"
													: ""
											}`}
											title={display}
										>
											{display}
										</td>
									);
								})}
							</tr>
						);
					})}
					<tr
						style={{
							height:
								rowVirtualizer.getTotalSize() -
								(rowVirtualizer.getVirtualItems().at(-1)?.end ?? 0),
						}}
					>
						<td colSpan={visibleCols.length + 2} />
					</tr>
				</tbody>
			</table>
		</div>
	);
}
