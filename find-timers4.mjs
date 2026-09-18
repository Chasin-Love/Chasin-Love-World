import fs from 'fs';
import path from 'path';

function walkDir(dir) {
  const results = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      results.push(...walkDir(p));
    } else if (/\.tsx$/.test(f)) {
      results.push(p);
    }
  }
  return results;
}

const files = walkDir('src');
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('setTimeout') || lines[i].includes('setInterval')) {
      const nextLines = lines.slice(i, Math.min(i+10, lines.length)).join('\n');
      if (!nextLines.includes('clearTimeout') && !nextLines.includes('clearInterval')) {
        console.log(file.replace('src/', '') + ':' + (i+1) + ' - ' + lines[i].trim());
      }
    }
  }
}