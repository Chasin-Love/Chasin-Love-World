import fs from 'fs';
import path from 'path';

function walk(dir) {
  const results = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      results.push(...walk(p));
    } else if (/\.tsx$/.test(f)) {
      results.push(p);
    }
  }
  return results;
}

function walk(dir) {
  const results = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      results.push(...walk(p));
    } else if (/\.tsx$/.test(f)) {
      results.push(p);
    }
  }
  return results;
}