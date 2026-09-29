import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
const baseline = new Map([
  ['20260929000000_initial.sql', 'd8bbc728e45967ff76832b8c2721e8f1942c24afa6b4b471278092d3fe617a5d'],
  ['20260929010000_content_limits.sql', 'fc71bf73cfc48ed4cb1b36f1f10fc070b2226fbb1498429d153bb40988e4bd16'],
  ['20260929020000_simplify_content.sql', '2771af51606010926928bb4c6b29b1f7f354e8631260bcd0604225aa5cfe9085'],
]);

const files = readdirSync(directory).filter((name) => name.endsWith('.sql')).sort();
if (files.length < baseline.size || files.some((name) => !/^\d{14}_[a-z0-9_]+\.sql$/.test(name))) {
  throw new Error('Migration filenames must use a 14-digit version and lowercase snake case');
}
const versions = files.map((name) => name.slice(0, 14));
if (new Set(versions).size !== versions.length) {
  throw new Error('Migration versions must be unique');
}
for (const [name, expected] of baseline) {
  if (!files.includes(name)) throw new Error(`Missing applied baseline migration: ${name}`);
  const actual = createHash('sha256').update(readFileSync(join(directory, name))).digest('hex');
  if (actual !== expected) throw new Error(`Applied baseline migration changed: ${name}`);
}
if (files.slice(0, baseline.size).some((name, index) => name !== [...baseline.keys()][index])) {
  throw new Error('New migrations must follow the applied baseline versions');
}
console.log(`Validated ${files.length} migration files and immutable applied baseline`);
