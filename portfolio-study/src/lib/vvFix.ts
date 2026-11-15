/**
 * iOS 26 Safari can leave the visual viewport panned relative to the layout
 * viewport after the keyboard opens and closes (WebKit bug 297779). Every
 * position:fixed element then sits displaced — the top nav ends up partly off
 * screen. CSS can't reset that, so we measure it and counter-translate.
 *
 * It publishes --vv-x / --vv-y (px) on <html>; fixed UI adds
 * `transform: translate(var(--vv-x, 0px), var(--vv-y, 0px))`. While a pinch zoom
 * is active (scale > 1) the offset is real and we leave things alone.
 *
 * `?debug=1` shows a small readout of the numbers, so a real-device report is one screenshot.
 */
export function installViewportFix(): void {
  const vv = window.visualViewport;
  if (!vv) return;

  const root = document.documentElement;
  const debug = new URLSearchParams(window.location.search).has("debug");
  let readout: HTMLDivElement | null = null;
  let raf = 0;
  let timer = 0;

  if (debug) {
    readout = document.createElement("div");
    readout.setAttribute("aria-hidden", "true");
    readout.style.cssText =
      "position:fixed;left:6px;bottom:6px;z-index:99999;padding:6px 8px;border-radius:6px;" +
      "background:rgba(0,0,0,.78);color:#8f8;font:11px/1.35 ui-monospace,monospace;white-space:pre;pointer-events:none";
    document.body.appendChild(readout);
  }

  const apply = () => {
    raf = 0;
    const zoomed = vv.scale > 1.02;
    const x = zoomed ? 0 : vv.offsetLeft;
    const y = zoomed ? 0 : vv.offsetTop;
    root.style.setProperty("--vv-x", `${x.toFixed(1)}px`);
    root.style.setProperty("--vv-y", `${y.toFixed(1)}px`);
    if (readout) {
      const scroller = document.querySelector<HTMLElement>("[data-scroll-root]");
      readout.textContent =
        `vv offset  ${vv.offsetLeft.toFixed(1)}, ${vv.offsetTop.toFixed(1)}\n` +
        `vv scale   ${vv.scale.toFixed(2)}\n` +
        `vv h / win ${Math.round(vv.height)} / ${window.innerHeight}\n` +
        `page scroll ${Math.round(window.scrollX)}, ${Math.round(window.scrollY)}\n` +
        `scroller x  ${scroller ? Math.round(scroller.scrollLeft) : "-"}`;
    }
  };

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(apply);
  };

  // After the keyboard closes the offset can stick: nudge the document back and re-measure.
  const settle = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const stuck = Math.abs(vv.offsetTop) > 1 || Math.abs(vv.offsetLeft) > 1;
      if (stuck && vv.scale <= 1.02) window.scrollTo(0, 0);
      schedule();
    }, 200);
  };

  vv.addEventListener("resize", () => {
    schedule();
    settle();
  });
  vv.addEventListener("scroll", () => {
    schedule();
    settle();
  });
  window.addEventListener("focusout", settle);
  window.addEventListener("orientationchange", settle);
  schedule();
}
