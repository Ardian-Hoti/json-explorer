"use client";

import {
	useState,
	useCallback,
	useMemo,
	useTransition,
	useRef,
	useEffect,
} from "react";
import {
	Search,
	Plus,
	RotateCcw,
	Download,
	Upload,
	FileJson,
	Loader2,
	ClipboardPaste,
	Columns3,
	X,
	Eye,
	EyeOff,
	CheckSquare,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import {
	detectFields,
	filterAndSort,
	type FilterDef,
	type SortConfig,
} from "@/lib/json-utils";
import { VirtualTable } from "./virtual-table";
import { FilterBar } from "./filter-bar";
import { DetailPanel } from "./detail-panel";
import { ThemeToggle } from "./theme-toggle";

export function JsonExplorer() {
	const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
	const [columns, setColumns] = useState<string[]>([]);
	const [search, setSearch] = useState("");
	const [filters, setFilters] = useState<FilterDef[]>([]);
	const [sort, setSort] = useState<SortConfig | null>(null);
	const [selectedItem, setSelectedItem] = useState<Record<
		string,
		unknown
	> | null>(null);
	const [isPending, startTransition] = useTransition();
	const [isLoading, setIsLoading] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [showPasteModal, setShowPasteModal] = useState(false);
	const [showColumnPicker, setShowColumnPicker] = useState(false);
	const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
		if (typeof window === "undefined") return new Set();
		try {
			const stored = localStorage.getItem("json-explorer-hidden-cols");
			return stored ? new Set(JSON.parse(stored)) : new Set();
		} catch {
			return new Set();
		}
	});
	const [pasteText, setPasteText] = useState("");
	const [pasteError, setPasteError] = useState("");
	const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
	const fileInputRef = useRef<HTMLInputElement>(null);
	const pasteRef = useRef<HTMLTextAreaElement>(null);
	const filterIdRef = useRef(0);

	const debouncedSearch = useDebounce(search, 200);

	// Visible columns = all columns minus hidden
	const visibleColumns = useMemo(
		() => columns.filter((c) => !hiddenColumns.has(c)),
		[columns, hiddenColumns],
	);

	// Persist hidden columns to localStorage
	const toggleColumn = useCallback((col: string) => {
		setHiddenColumns((prev) => {
			const next = new Set(prev);
			if (next.has(col)) next.delete(col);
			else next.add(col);
			try {
				localStorage.setItem(
					"json-explorer-hidden-cols",
					JSON.stringify([...next]),
				);
			} catch {
				/* noop */
			}
			return next;
		});
	}, []);

	const showAllColumns = useCallback(() => {
		setHiddenColumns(new Set());
		try {
			localStorage.removeItem("json-explorer-hidden-cols");
		} catch {
			/* noop */
		}
	}, []);

	const hideAllColumns = useCallback(() => {
		const all = new Set(columns);
		setHiddenColumns(all);
		try {
			localStorage.setItem(
				"json-explorer-hidden-cols",
				JSON.stringify([...all]),
			);
		} catch {
			/* noop */
		}
	}, [columns]);

	// Clear data and go back to empty state
	const clearData = useCallback(() => {
		startTransition(() => {
			setRawData([]);
			setColumns([]);
			setFilters([]);
			setSort(null);
			setSearch("");
			setSelectedItem(null);
			setSelectedRows(new Set());
		});
	}, []);

	// Row selection for bulk actions
	const toggleRow = useCallback((index: number) => {
		setSelectedRows((prev) => {
			const next = new Set(prev);
			if (next.has(index)) next.delete(index);
			else next.add(index);
			return next;
		});
	}, []);
	const searchCache = useMemo(() => {
		const cache = new Map<Record<string, unknown>, string>();
		for (const item of rawData) {
			cache.set(item, JSON.stringify(item).toLowerCase());
		}
		return cache;
	}, [rawData]);
	const filteredData = useMemo(() => {
		setSelectedRows(new Set()); // clear selection when data changes
		return filterAndSort(
			rawData,
			searchCache,
			debouncedSearch,
			filters,
			sort,
		);
	}, [rawData, searchCache, debouncedSearch, filters, sort]);
	const toggleAllRows = useCallback(() => {
		setSelectedRows((prev) => {
			if (prev.size === filteredData.length) return new Set();
			return new Set(filteredData.map((_, i) => i));
		});
	}, [filteredData]);

	const exportSelected = useCallback(() => {
		const items = [...selectedRows]
			.sort((a, b) => a - b)
			.map((i) => filteredData[i])
			.filter(Boolean);
		if (items.length === 0) return;
		const blob = new Blob([JSON.stringify(items, null, 2)], {
			type: "application/json",
		});
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = `selected-${items.length}.json`;
		a.click();
		URL.revokeObjectURL(a.href);
	}, [selectedRows, filteredData]);

	// Pre-cache JSON.stringify for global search - only recomputed when rawData changes

	// Memoized filter + sort pipeline

	const loadJson = useCallback((text: string) => {
		try {
			const parsed = JSON.parse(text);
			const data = Array.isArray(parsed) ? parsed : [parsed];
			const cols = detectFields(data);
			startTransition(() => {
				setRawData(data);
				setColumns(cols);
				setFilters([]);
				setSort(null);
				setSearch("");
				setSelectedItem(null);
				setShowPasteModal(false);
				setPasteText("");
				setPasteError("");
				setIsLoading(false);
			});
		} catch {
			setIsLoading(false);
			throw new Error("Invalid JSON");
		}
	}, []);

	const handleFile = useCallback(
		(file: File) => {
			setIsLoading(true);
			const reader = new FileReader();
			reader.onload = (event) => {
				try {
					loadJson(event.target?.result as string);
				} catch {
					alert("Invalid JSON file");
				}
			};
			reader.readAsText(file);
		},
		[loadJson],
	);

	const handlePasteSubmit = useCallback(() => {
		if (!pasteText.trim()) return;
		setIsLoading(true);
		setPasteError("");
		try {
			loadJson(pasteText);
		} catch {
			setIsLoading(false);
			setPasteError(
				"Could not parse JSON. Check your syntax and try again.",
			);
		}
	}, [pasteText, loadJson]);

	const handleFileInput = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) handleFile(file);
		},
		[handleFile],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			const file = e.dataTransfer.files[0];
			if (file) handleFile(file);
		},
		[handleFile],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);

	const addFilter = useCallback(() => {
		if (columns.length === 0) return;
		filterIdRef.current += 1;
		setFilters((prev) => [
			...prev,
			{
				id: String(filterIdRef.current),
				field: columns[0],
				operator: "contains",
				val1: "",
				val2: "",
			},
		]);
	}, [columns]);

	const resetAll = useCallback(() => {
		startTransition(() => {
			setFilters([]);
			setSort(null);
			setSearch("");
			setSelectedItem(null);
		});
	}, []);

	const exportFiltered = useCallback(() => {
		const blob = new Blob([JSON.stringify(filteredData, null, 2)], {
			type: "application/json",
		});
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = "filtered.json";
		a.click();
		URL.revokeObjectURL(a.href);
	}, [filteredData]);

	const handleSort = useCallback((field: string) => {
		setSort((prev) => {
			if (prev?.field === field) {
				return {
					field,
					direction: prev.direction === "asc" ? "desc" : "asc",
				};
			}
			return { field, direction: "asc" };
		});
	}, []);

	const handleSelect = useCallback((item: Record<string, unknown>) => {
		setSelectedItem((prev) => (prev === item ? null : item));
	}, []);
	const hasData = rawData.length > 0;

	// Global paste: auto-load JSON from clipboard when no data loaded
	useEffect(() => {
		const onPaste = (e: ClipboardEvent) => {
			// Don't intercept if user is typing in an input/textarea
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA") return;
			if (hasData) return;
			const text = e.clipboardData?.getData("text/plain");
			if (text?.trim()) {
				try {
					loadJson(text);
				} catch {
					// Not valid JSON from clipboard, ignore
				}
			}
		};
		window.addEventListener("paste", onPaste);
		return () => window.removeEventListener("paste", onPaste);
	}, [hasData, loadJson]);

	// Escape key closes detail panel and paste modal
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setSelectedItem(null);
				setShowPasteModal(false);
				setShowColumnPicker(false);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	// Focus textarea when paste modal opens
	useEffect(() => {
		if (showPasteModal) {
			requestAnimationFrame(() => pasteRef.current?.focus());
		}
	}, [showPasteModal]);

	return (
		<div
			className="flex h-screen flex-col bg-background text-foreground"
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
		>
			{/* Header toolbar */}
			<header className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
				<input
					ref={fileInputRef}
					type="file"
					accept=".json"
					onChange={handleFileInput}
					className="hidden"
				/>
				<button
					onClick={() => fileInputRef.current?.click()}
					className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
				>
					<Upload className="size-3.5" />
					Load JSON
				</button>
				<button
					onClick={() => {
						setShowPasteModal(true);
						setPasteError("");
					}}
					className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
				>
					<ClipboardPaste className="size-3.5" />
					Paste JSON
				</button>
				{!hasData && <ThemeToggle />}

				{hasData && (
					<>
						<div className="relative">
							<Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
							<input
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search all fields..."
								className="w-56 rounded-md border border-border bg-input py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
							/>
						</div>

						<button
							onClick={addFilter}
							className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
						>
							<Plus className="size-3.5" />
							Filter
						</button>

						<button
							onClick={resetAll}
							className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
						>
							<RotateCcw className="size-3.5" />
							Reset
						</button>

						<button
							onClick={exportFiltered}
							className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
						>
							<Download className="size-3.5" />
							Export
						</button>

						{selectedRows.size > 0 && (
							<button
								onClick={exportSelected}
								className="inline-flex items-center gap-1.5 rounded-md bg-primary/15 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
							>
								<CheckSquare className="size-3.5" />
								Export {selectedRows.size} selected
							</button>
						)}

						<div className="relative">
							<button
								onClick={() => setShowColumnPicker((p) => !p)}
								className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
							>
								<Columns3 className="size-3.5" />
								Columns
								{hiddenColumns.size > 0 && (
									<span className="rounded-full bg-primary/20 px-1.5 text-[10px] font-medium text-primary">
										{hiddenColumns.size} hidden
									</span>
								)}
							</button>

							{showColumnPicker && (
								<>
									<div
										className="fixed inset-0 z-30"
										onClick={() => setShowColumnPicker(false)}
									/>
									<div className="absolute left-0 top-full z-40 mt-1 flex max-h-80 w-72 flex-col rounded-lg border border-border bg-card shadow-xl">
										<div className="flex items-center justify-between border-b border-border px-3 py-2">
											<span className="text-xs font-medium text-foreground">
												Toggle columns
											</span>
											<div className="flex items-center gap-1">
												<button
													onClick={showAllColumns}
													className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
												>
													Show all
												</button>
												<button
													onClick={hideAllColumns}
													className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
												>
													Hide all
												</button>
											</div>
										</div>
										<div className="flex-1 overflow-y-auto p-1.5">
											{columns.map((col) => {
												const isHidden = hiddenColumns.has(col);
												const parts = col.split(".");
												const indent = (parts.length - 1) * 12;
												return (
													<button
														key={col}
														onClick={() => toggleColumn(col)}
														className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-secondary ${
															isHidden
																? "text-muted-foreground/50"
																: "text-foreground"
														}`}
														style={{
															paddingLeft: `${8 + indent}px`,
														}}
													>
														{isHidden ? (
															<EyeOff className="size-3 shrink-0 text-muted-foreground/40" />
														) : (
															<Eye className="size-3 shrink-0 text-primary" />
														)}
														<span className="truncate font-mono">
															{parts.length > 1 && (
																<span className="text-muted-foreground/40">
																	{parts
																		.slice(0, -1)
																		.join(".")}
																	.
																</span>
															)}
															{parts[parts.length - 1]}
														</span>
													</button>
												);
											})}
										</div>
									</div>
								</>
							)}
						</div>

						<button
							onClick={clearData}
							className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-2.5 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
						>
							<X className="size-3.5" />
							Close
						</button>

						<div className="ml-auto flex items-center gap-2 text-xs">
							{isPending && (
								<Loader2 className="size-3.5 animate-spin text-primary" />
							)}
							<span className="font-mono text-primary">
								{filteredData.length.toLocaleString()}
							</span>
							<span className="text-muted-foreground">
								/ {rawData.length.toLocaleString()} rows
							</span>
						</div>
						<ThemeToggle />
					</>
				)}
			</header>

			{/* Filter rows */}
			<FilterBar filters={filters} columns={columns} onChange={setFilters} />

			{/* Main content */}
			<div className="flex flex-1 overflow-hidden">
				{!hasData ? (
					<div
						className={`flex flex-1 flex-col items-center justify-center gap-4 transition-colors ${
							isDragging ? "bg-primary/5" : ""
						}`}
					>
						{isLoading ? (
							<Loader2 className="size-8 animate-spin text-primary" />
						) : (
							<>
								<div
									className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-16 py-12 transition-colors ${
										isDragging
											? "border-primary bg-primary/5"
											: "border-border"
									}`}
								>
									<FileJson className="size-10 text-muted-foreground" />
									<p className="text-sm text-muted-foreground">
										Drop a JSON file, paste from clipboard, or click
										to browse
									</p>
									<div className="flex items-center gap-2">
										<button
											onClick={() => fileInputRef.current?.click()}
											className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
										>
											Choose File
										</button>
										<button
											onClick={() => {
												setShowPasteModal(true);
												setPasteError("");
											}}
											className="rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
										>
											Paste JSON
										</button>
									</div>
									<p className="text-[11px] text-muted-foreground/60">
										Tip: Just press Ctrl+V / Cmd+V to paste directly
									</p>
								</div>
							</>
						)}
					</div>
				) : (
					<>
						{/* Table area */}
						<div
							className={`flex-1 overflow-hidden transition-all ${
								selectedItem ? "w-[60%]" : "w-full"
							}`}
						>
							<VirtualTable
								data={filteredData}
								columns={visibleColumns}
								sort={sort}
								onSort={handleSort}
								selectedItem={selectedItem}
								onOpenDetail={handleSelect}
								selectedRows={selectedRows}
								onToggleRow={toggleRow}
								onToggleAll={toggleAllRows}
							/>
						</div>

						{/* Detail panel */}
						{selectedItem && (
							<div className="w-[40%] overflow-hidden">
								<DetailPanel
									item={selectedItem}
									onClose={() => setSelectedItem(null)}
								/>
							</div>
						)}
					</>
				)}
			</div>

			{/* Paste JSON modal */}
			{showPasteModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
					onClick={(e) => {
						if (e.target === e.currentTarget) setShowPasteModal(false);
					}}
				>
					<div className="mx-4 flex w-full max-w-xl flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xl">
						<div className="flex items-center justify-between">
							<h2 className="text-sm font-medium text-foreground">
								Paste JSON
							</h2>
							<button
								onClick={() => setShowPasteModal(false)}
								className="text-xs text-muted-foreground hover:text-foreground"
							>
								Esc
							</button>
						</div>
						<textarea
							ref={pasteRef}
							value={pasteText}
							onChange={(e) => {
								setPasteText(e.target.value);
								setPasteError("");
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
									e.preventDefault();
									handlePasteSubmit();
								}
							}}
							placeholder="Paste your JSON here... (array or object)"
							className="h-64 w-full resize-none rounded-md border border-border bg-input p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
							spellCheck={false}
						/>
						{pasteError && (
							<p className="text-xs text-destructive">{pasteError}</p>
						)}
						<div className="flex items-center justify-between">
							<span className="text-[11px] text-muted-foreground">
								Ctrl+Enter to submit
							</span>
							<div className="flex items-center gap-2">
								<button
									onClick={() => setShowPasteModal(false)}
									className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
								>
									Cancel
								</button>
								<button
									onClick={handlePasteSubmit}
									disabled={!pasteText.trim() || isLoading}
									className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
								>
									{isLoading ? (
										<Loader2 className="size-3 animate-spin" />
									) : (
										<ClipboardPaste className="size-3" />
									)}
									Load
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
