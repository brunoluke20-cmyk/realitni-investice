import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const jsFiles = fs.readdirSync(root).filter(name => name.endsWith('.js') && name !== 'playwright.config.js');
for (const file of jsFiles) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  try { new Function(source); }
  catch (error) { throw new Error('Syntax error in ' + file + ': ' + error.message); }
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scriptRefs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(match => match[1]);
assert.ok(scriptRefs.length > 0, 'index.html must load local scripts');
for (const ref of scriptRefs) {
  if (ref.startsWith('https://') || ref.startsWith('http://')) continue;
  const clean = ref.split('?')[0].split('#')[0];
  assert.ok(fs.existsSync(path.join(root, clean)), 'Missing local script referenced by index.html: ' + ref);
}
const workspace = fs.readFileSync(path.join(root, 'project-workspace.js'), 'utf8');
assert.match(workspace, /reiListingRefreshButton/, 'Refresh button must exist');
assert.match(workspace, /reiListingMetroFilter/, 'Metro filter must exist');
assert.match(workspace, /reiListingUnitsFilter/, 'Unit-count filter must exist');
assert.doesNotMatch(workspace, /reiListingRenovationFilter/, 'Mixed search must not ask users to choose renovation mode');
assert.match(workspace, /mix investičních i rekonstrukčních příležitostí/, 'Catalog must describe the always-mixed listing set');
assert.match(workspace, /openListingToolChooser\(r\)/, 'Listing-to-tool chooser workflow must remain wired');
assert.ok(workspace.includes("link.rel='noopener noreferrer'"), 'External listing links should use opener protection');
assert.ok(!workspace.includes('Hodnocení lokality:'), 'Removed location-score UI must not return');
assert.ok(!workspace.includes('Investiční potenciál:'), 'Removed investment-potential score UI must not return');
const feed = JSON.parse(fs.readFileSync(path.join(root, 'listings-feed.json'), 'utf8'));
assert.ok(Array.isArray(feed.listings), 'Listing feed must contain a listings array');
console.log('Static audit passed: JavaScript syntax, local script references, core controls, chooser workflow and feed schema.');
