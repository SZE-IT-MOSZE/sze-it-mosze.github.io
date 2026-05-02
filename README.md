# SZE IT MOSZE Site

Astro-based course website for Modern Szoftverfejlesztesi Eszkozok.

## Requirements

- Node.js
- npm

## Install

Run this once after cloning the repository:

```sh
npm install
```

## Start Local Preview

For day-to-day editing, start the Astro development server:

```sh
npm run dev
```

Then open the local URL printed by Astro, usually:

```text
http://localhost:4321
```

The student work page is available at:

```text
http://localhost:4321/students/
```

## Build

Generate the static production site into `dist/`:

```sh
npm run build
```

## Preview Production Build

After building, preview the generated production output locally:

```sh
npm run preview
```

Astro will print the local preview URL in the terminal.

## Useful Project Files

- `src/pages/` contains Astro pages.
- `src/pages/students.astro` renders the student work listing page.
- `src/data/studentWorks.ts` contains the editable student work links.
- `src/content/lectures/` contains lecture Markdown files.
- `src/content/hall-of-fame/` contains Hall of Fame project data.
- `src/styles/global.css` contains shared site styling.
