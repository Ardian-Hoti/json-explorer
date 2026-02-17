// Flatten nested object keys into dot-notation leaf paths only
export function flatten(
	obj: Record<string, unknown>,
	prefix = "",
	res: string[] = [],
): string[] {
	for (const key in obj) {
		const path = prefix ? `${prefix}.${key}` : key;
		const val = obj[key];

		if (Array.isArray(val)) {
			if (val.length > 0 && typeof val[0] === "object" && val[0] !== null) {
				// Walk into array items to get leaf fields
				for (const item of val) {
					flatten(item as Record<string, unknown>, path, res);
				}
			} else {
				// Primitive array - treat as leaf
				res.push(path);
			}
		} else if (typeof val === "object" && val !== null) {
			// Walk into nested objects - don't add this path as a column
			flatten(val as Record<string, unknown>, path, res);
		} else {
			res.push(path);
		}
	}
	return res;
}

// Detect all unique field paths across the dataset
export function detectFields(data: Record<string, unknown>[]): string[] {
	const fields = new Set<string>();
	for (const obj of data) {
		for (const k of flatten(obj)) {
			fields.add(k);
		}
	}
	return Array.from(fields);
}

// Resolve dot-notation path to values (handles arrays)
export function getValues(
	obj: Record<string, unknown>,
	path: string,
): unknown[] {
	const parts = path.split(".");
	let values: unknown[] = [obj];

	for (const part of parts) {
		const newVals: unknown[] = [];
		for (const v of values) {
			if (v == null || typeof v !== "object") continue;
			const rec = v as Record<string, unknown>;
			if (Array.isArray(rec[part])) {
				newVals.push(...(rec[part] as unknown[]));
			} else if (rec[part] !== undefined) {
				newVals.push(rec[part]);
			}
		}
		values = newVals;
	}

	return values.filter((v) => v !== undefined);
}

export interface FilterDef {
	id: string;
	field: string;
	operator: string;
	val1: string;
	val2: string;
}

export type SortDirection = "asc" | "desc";

export interface SortConfig {
	field: string;
	direction: SortDirection;
}

// Apply a single filter to an item
function matchesFilter(
	item: Record<string, unknown>,
	filter: FilterDef,
): boolean {
	const { field, operator, val1, val2 } = filter;
	const rawValue = getValues(item, field);

	// Array-level operators
	const directField = field.split(".")[0];
	const directValue = item[directField];

	if (Array.isArray(directValue) && !field.includes(".")) {
		const length = directValue.length;
		if (operator === "is_empty") return length === 0;
		if (operator === "is_not_empty") return length !== 0;
		if (operator === "length_equals") return length === parseInt(val1);
		if (operator === "length_gt") return length > parseInt(val1);
		if (operator === "length_lt") return length < parseInt(val1);
		return true;
	}

	// Normal value comparisons
	return rawValue.some((v) => {
		if (v == null) return false;
		const num = parseFloat(String(v));
		const isNum = !isNaN(num);

		switch (operator) {
			case "contains":
				return String(v).toLowerCase().includes(val1.toLowerCase());
			case "equals":
				return String(v) === val1;
			case ">":
				return isNum && num > parseFloat(val1);
			case "<":
				return isNum && num < parseFloat(val1);
			case "between":
				return isNum && num >= parseFloat(val1) && num <= parseFloat(val2);
			case "is_empty":
				return String(v).trim() === "";
			case "is_not_empty":
				return String(v).trim() !== "";
			default:
				return false;
		}
	});
}

// Filter + sort pipeline - pure function for memoization
export function filterAndSort(
	data: Record<string, unknown>[],
	searchCache: Map<Record<string, unknown>, string>,
	search: string,
	filters: FilterDef[],
	sort: SortConfig | null,
): Record<string, unknown>[] {
	const searchLower = search.toLowerCase();

	// Filter
	let result = data;

	if (searchLower || filters.length > 0) {
		result = data.filter((item) => {
			// Global search using pre-cached stringified text
			if (searchLower) {
				const cached = searchCache.get(item) ?? "";
				if (!cached.includes(searchLower)) return false;
			}

			// Column filters
			for (const filter of filters) {
				if (!matchesFilter(item, filter)) return false;
			}

			return true;
		});
	}

	// Sort
	if (sort) {
		result = [...result].sort((a, b) => {
			const aVals = getValues(a, sort.field);
			const bVals = getValues(b, sort.field);
			let aVal = aVals[0] ?? "";
			let bVal = bVals[0] ?? "";

			const aNum = parseFloat(String(aVal));
			const bNum = parseFloat(String(bVal));

			if (!isNaN(aNum) && !isNaN(bNum)) {
				return sort.direction === "asc" ? aNum - bNum : bNum - aNum;
			}

			return sort.direction === "asc"
				? String(aVal).localeCompare(String(bVal))
				: String(bVal).localeCompare(String(aVal));
		});
	}

	return result;
}
