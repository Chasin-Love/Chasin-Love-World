import fs from 'fs';
import path from 'path';

function walk(dir) {
  const results = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) results.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(f)) results.push(p);
  }
  return results;
}

const files = walk('src');

const patterns = [
  { name: 'Empty catch blocks', regex: /catch\s*\([^)]*\)\s*\{\s*\}/g },
  { name: 'forEach with async callback', regex: /\.forEach\s*\(\s*async\s+/g },
  { name: 'forEach with async callback (alt)', regex: /forEach\s*\(.*async\s+/g },
  { name: 'Missing await in .map', regex: /\.map\s*\(\s*async\s+/g },
  { name: 'setTimeout/Interval without cleanup', regex: /set(Timeout|Interval)\s*\([^)]+\)\s*(?!.*clear(Timeout|Interval))/g },
  { name: 'addEventListener without remove', regex: /addEventListener\s*\([^)]+\)\s*(?!.*removeEventListener)/g },
  { name: 'useEffect missing dependency array', regex: /useEffect\s*\([^,]+,\s*\[\s*\]/g },
  { name: 'Missing await in .map', regex: /\.map\s*\(\s*async\s+/g },
  { name: 'Promise without .catch', regex: /\.then\s*\([^)]*\)\s*(?!.*\.catch)/g },
  { name: 'setTimeout/Interval in render/effect without cleanup', regex: /(useEffect|useLayoutEffect)\([^)]*set(Timeout|Interval)/g },
];

let results = {};
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  for (const pattern of patterns) {
    const matches = content.match(pattern.regex);
    if (matches && matches.length > 0) {
      if (!results[pattern.name]) results[pattern.name] = [];
      results[pattern.name].push({ file: file.replace('src/', ''), count: matches.length, samples: matches.slice(0, 2) });
    }
  }
}

for (const [name, items] of Object.entries(results)) {
  console.log('\n=== ' + name + ' (' + items.reduce((a,b)=>a+b.count,0) + ' occurrences) ===');
  for (const item of items.slice(0, 3)) {
    console.log('  ' + item.file + ' (' + item.count + ')');
    for (const s of item.samples) console.log('    ' + s.slice(0, 120));
  }
  if (items.length > 3) console.log('  ... and ' + (items.length - 3) + ' more files');
}