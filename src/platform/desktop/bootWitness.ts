/**
 * R104 — THE DESKTOP BOOT WITNESS (the R98 honesty law, welded into the
 * reborn shell's birth). The old shell launched WebView2 with zero GPU
 * configuration; when the webview fell back to software rendering the app
 * silently downgraded and the whole universe crawled with no words anywhere
 * naming the cause. The reborn shell speaks once, at boot, desktop only:
 *
 *   [desktop] boot witness — GPU: <renderer> · tier: <tier> · physics: <backend> · webview: <userAgent>
 *
 * Web mode is untouched: isDesktop() is false there and this function
 * returns before doing anything — no canvas, no probe, no log.
 */
import { isDesktop } from './adapter';
import { probeCapability } from '../../engine/capability';
import { cosmosBridge } from '../native/cpp_bridge';

let witnessed = false;

export function witnessDesktopBoot(): void {
  if (witnessed || !isDesktop()) return;
  witnessed = true;
  const cap = probeCapability();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
  cosmosBridge
    .init()
    .then((status) => {
      console.info(
        `[desktop] boot witness — GPU: ${cap.renderer} · tier: ${cap.tier} · physics: ${status.backend} · webview: ${ua}`,
      );
    })
    .catch(() => {
      console.info(
        `[desktop] boot witness — GPU: ${cap.renderer} · tier: ${cap.tier} · physics: unavailable · webview: ${ua}`,
      );
    });
}
