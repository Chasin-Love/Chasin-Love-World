/**
 * ROUND 90 — THE REACHABLE TWIN gauntlet.
 *
 * The author could not scroll the Native Simulator Twin card (and its
 * Verify Twin button) into view. The root cause was a Tailwind v4
 * cascade-layer trap: `.cc-root { position: relative }` — unlayered
 * author CSS — silently defeated the markup's layered `fixed inset-0`,
 * the deck fell into document flow inside an overflow-hidden page, and
 * everything below the fold became unreachable. The invariants that keep
 * the deck reachable are pinned here:
 *
 *  - THE VIEWPORT LOCK: .cc-root declares position: fixed + inset: 0 in
 *    CSS itself (utilities only agree; the unlayered rule always wins,
 *    so the lock must live in the unlayered rule).
 *  - The lock never regresses to relative/absolute/static.
 *  - The deck's scroll body keeps min-h-0 + overflow-y-auto +
 *    overscroll-contain (the constrained flex child that actually scrolls).
 *  - The Twin Jump exists: the top-bar seal (#cc-twin-jump-btn), the
 *    card target (#simulator-twin-card), the reduced-motion respect and
 *    the frame-starve snap (arrival verified ~900 ms after the smooth
 *    attempt, instant fallback).
 */
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const cssSrc = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8');
const consoleSrc = readFileSync(new URL('../../src/ui/console/CoreConsole.tsx', import.meta.url), 'utf8');

/* ==== 1. THE VIEWPORT LOCK — .cc-root is fixed in the unlayered rule ==== */
{
  const ruleMatch = cssSrc.match(/\.cc-root\s*\{[^}]*\}/);
  const rule = ruleMatch ? ruleMatch[0] : '';
  check('R90: .cc-root declares position: fixed in CSS itself', /position:\s*fixed/.test(rule), rule.slice(0, 80));

  check('R90: .cc-root declares inset: 0 in CSS itself', /inset:\s*0/.test(rule), 'inset missing');

  const regressed = /position:\s*(relative|absolute|static)/.test(rule.replace(/\/\*[\s\S]*?\*\//g, ''));
  check('R90: .cc-root never regresses to relative/absolute/static', !regressed, 'the cascade trap would return');
}

/* ==== 2. THE SCROLL BODY — the deck's inner scroller stays constrained ==== */
{
  const body = /flex-1 min-h-0 overflow-y-auto custom-scroll overscroll-contain/.test(consoleSrc);
  check('R90: the deck scroll body keeps min-h-0 + overflow-y-auto + overscroll-contain', body, 'the scroller can slip past the viewport again');

  const utilitiesAgree = /cc-root fixed inset-0/.test(consoleSrc);
  check('R90: the markup still carries the agreeing fixed inset-0 utilities', utilitiesAgree, 'utilities disagree with the CSS');
}

/* ==== 3. THE TWIN JUMP — the one-click path to the twin card ==== */
{
  const seal = /id="cc-twin-jump-btn"/.test(consoleSrc);
  check('R90: the top-bar Twin Jump seal exists (#cc-twin-jump-btn)', seal, 'no guaranteed path to the card');

  const target = /id="simulator-twin-card"/.test(consoleSrc);
  check('R90: the twin card carries the jump target (#simulator-twin-card)', target, 'the seal has nothing to scroll to');

  const reducedMotion = /prefers-reduced-motion:\s*reduce/.test(consoleSrc);
  check('R90: the jump honors the reduced-motion safety net', reducedMotion, 'smooth-only jump violates the law');

  const snap = /Math\.abs\(gap\)\s*>\s*80/.test(consoleSrc) && /block:\s*'start'/.test(consoleSrc);
  check('R90: the jump verifies arrival and snaps when a frame-starved window freezes the smooth scroll', snap, 'smooth scroll silently does nothing when rAF is starved');
}

/* ==== 4. THE CHAIN — the gauntlet rides the verify chain ==== */
{
  const pkgSrc = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const chained = pkgSrc.includes('round90-reachable-twin-gauntlet');
  check('R90: the gauntlet sits in the verify chain', chained, 'add scripts/round90-reachable-twin-gauntlet.ts to npm run verify');
}

if (failures > 0) {
  console.error(`\nR90 REACHABLE TWIN GAUNTLET — ${failures} FAILURE${failures > 1 ? 'S' : ''}`);
  process.exit(1);
} else {
  console.log('\nR90 REACHABLE TWIN GAUNTLET — ALL GREEN');
}
