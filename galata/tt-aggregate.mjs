// Collapse Trusted Types records into one row per source site.
// Usage: node tt-aggregate.mjs <violations-dir> [--json] > out
// Needs the report-only server still running: it fetches each bundle
// to read its inline source map.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SourceMapConsumer } from 'source-map';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const dir = args.find(a => !a.startsWith('--')) ?? 'tt-violations';
const FRAME = /(https?:\/\/[^\s()]+?\.js):(\d+):(\d+)/;
const maps = new Map();

async function mapFor(url) {
  if (!maps.has(url)) {
    let consumer = null;
    try {
      const js = await (await fetch(url)).text();
      const m = js.match(
        /sourceMappingURL=data:application\/json;(?:charset=[^;]+;)?base64,([A-Za-z0-9+/=]+)/
      );
      if (m) {
        consumer = await new SourceMapConsumer(
          JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'))
        );
      }
    } catch {
      // leave this bundle unmapped
    }
    maps.set(url, consumer);
  }
  return maps.get(url);
}

// Map the first frames; prefer the first one in JupyterLab's own code.
async function locate(stack) {
  const frames = String(stack)
    .split('\n')
    .map(l => l.match(FRAME))
    .filter(Boolean)
    .slice(0, 6);
  const mapped = [];
  for (const [, url, line, col] of frames) {
    const pos = (await mapFor(url))?.originalPositionFor({
      line: +line,
      column: +col - 1
    });
    mapped.push(
      pos?.source
        ? `${pos.source.replace(/^.*?\/(packages|dev_mode|node_modules)\//, '$1/')}:${pos.line}`
        : `${url}:${line}:${col}`
    );
  }
  const own = mapped.find(
    m => m.startsWith('packages/') || m.startsWith('dev_mode/')
  );
  return { site: own ?? mapped[0] ?? 'unknown', via: mapped[0] ?? '' };
}

const sites = new Map();
for (const name of await readdir(dir)) {
  if (!name.endsWith('.json')) continue;
  const { title, records } = JSON.parse(
    await readFile(join(dir, name), 'utf8')
  );
  for (const r of records) {
    if (r.type === 'policy-error') continue;
    const { site, via } = await locate(r.stack);
    const key = `${site}|${r.sink}`;
    const s = sites.get(key) ?? {
      site,
      via,
      sink: r.sink,
      type: r.type,
      hits: 0,
      tests: new Set(),
      sample: r.sample
    };
    s.hits += r.count ?? 1;
    s.tests.add(title);
    sites.set(key, s);
  }
}

const rows = [...sites.values()]
  .sort((a, b) => b.tests.size - a.tests.size)
  .map(s => ({
    site: s.site,
    via: s.via === s.site ? '' : s.via,
    sink: s.sink,
    type: s.type,
    hits: s.hits,
    tests: s.tests.size,
    example_test: [...s.tests][0],
    sample: String(s.sample).slice(0, 80)
  }));

if (asJson) {
  console.log(JSON.stringify(rows, null, 1));
} else {
  const q = v => `"${String(v).replace(/\s+/g, ' ').replace(/"/g, '""')}"`;
  console.log('site,via,sink,type,hits,tests,example_test,sample');
  for (const r of rows) console.log(Object.values(r).map(q).join(','));
}
