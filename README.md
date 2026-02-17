# JSON Explorer

A small Next.js application for interactively exploring and inspecting large JSON data sets. The app focuses on performance and usability by combining virtualized rendering, filtering, and a detail panel for quick inspection of selected nodes.

Key features

- Virtualized table/list rendering for large JSON payloads (fast scrolling)
- Filter and search with debounce for responsive filtering
- Detail panel showing the selected node's full JSON and contextual metadata
- Theme support and reusable UI components

Tech stack

- Next.js (React)
- React + TypeScript
- Virtualization: `@tanstack/react-virtual`
- Tailwind CSS + custom components

Quickstart
Prerequisites: Node.js (16+) and a package manager (`npm`, `pnpm`, or `yarn`).

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
npm start
```

Useful files

- `app/` – Next.js app routes and pages
- `components/json-explorer.tsx` – main explorer UI
- `components/virtual-table.tsx` – virtualized table implementation
- `components/filter-bar.tsx` – filtering UI
- `lib/json-utils.ts` – JSON helpers and utilities
- `hooks/use-debounce.ts` – input debounce hook
