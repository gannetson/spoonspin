#!/usr/bin/env tsx
/**
 * @deprecated Prefer `npm run db:import-content`.
 * Authored TypeScript menus are no longer in git — this delegates to the dump importer.
 */
console.warn(
  "db:seed-content now imports data/content-dump.json (authored TS menus removed).",
);
console.warn("Create a dump with: npm run db:export-content");
await import("./import-content.ts");
