// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Sanitizer } from '@jupyterlab/apputils';
import { renderText } from '@jupyterlab/rendermime';

describe('@jupyterlab/rendermime', () => {
  describe('renderText()', () => {
    let host: HTMLElement;

    beforeEach(() => {
      jest.useFakeTimers();
      host = document.createElement('div');
      document.body.appendChild(host);
    });

    afterEach(() => {
      // Restore any spies (e.g. on requestAnimationFrame) before draining so
      // that pending frames can run and leave the shared render queue empty.
      jest.restoreAllMocks();
      jest.runAllTimers();
      jest.useRealTimers();
      host.remove();
    });

    it('renders text and auto-links URLs across animation frames', async () => {
      const sanitizer = new Sanitizer();
      await renderText({ host, sanitizer, source: 'see www.example.com here' });

      // Drive the requestAnimationFrame-based rendering loop to completion.
      jest.runAllTimers();

      expect(host.textContent).toBe('see www.example.com here');
      const anchors = host.querySelectorAll('a');
      expect(anchors).toHaveLength(1);
      expect(anchors[0].textContent).toBe('www.example.com');
      expect(anchors[0].href).toContain('www.example.com');
    });

    it('paints even when requestAnimationFrame never fires', async () => {
      // Simulate requestAnimationFrame being starved (background tab or heavy
      // resource pressure): it hands back a handle but never calls back.
      jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);

      const sanitizer = new Sanitizer();
      await renderText({ host, sanitizer, source: 'see www.example.com here' });

      // Nothing is painted yet - the animation frame is never delivered.
      expect(host.textContent).toBe('');

      // The timer fallback still delivers the first paint.
      jest.advanceTimersByTime(200);

      expect(host.textContent).toBe('see www.example.com here');
      expect(host.querySelectorAll('a')).toHaveLength(1);
    });

    it('paints even when the observer reports the host as not intersecting before the first paint', async () => {
      // Before it has painted, the host is empty and (because `RenderedText`
      // applies `contain: style layout`) collapses to zero height, which the
      // intersection observer can report as not intersecting even when the
      // output is within the viewport. The first paint must not be gated on the
      // observer, otherwise it would deadlock: never paint -> stays zero height
      // -> never reported visible.
      let observerCallback: IntersectionObserverCallback | undefined;
      jest
        .spyOn(window, 'IntersectionObserver')
        .mockImplementation((cb: IntersectionObserverCallback) => {
          observerCallback = cb;
          return {
            observe: () => undefined,
            unobserve: () => undefined,
            disconnect: () => undefined,
            takeRecords: () => []
          } as unknown as IntersectionObserver;
        });

      const sanitizer = new Sanitizer();
      await renderText({ host, sanitizer, source: 'see www.example.com here' });

      // The observer reports the still-empty (zero-height) host as off-screen
      // before it has had a chance to paint.
      observerCallback!(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );

      jest.runAllTimers();

      expect(host.textContent).toBe('see www.example.com here');
      expect(host.querySelectorAll('a')).toHaveLength(1);
    });

    it('paints multiple outputs when animation frames are starved', async () => {
      // With more than one output the per-frame render queue rotates hosts, so a
      // naive first-paint fallback that races a single timer would be defeated:
      // each host would be rotated past its turn and drop its fallback. Under
      // sustained `requestAnimationFrame` starvation every output must still be
      // painted by the watchdog.
      jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);

      const sanitizer = new Sanitizer();
      const hostA = document.createElement('div');
      const hostB = document.createElement('div');
      document.body.appendChild(hostA);
      document.body.appendChild(hostB);

      void renderText({ host: hostA, sanitizer, source: 'output www.a.com' });
      void renderText({ host: hostB, sanitizer, source: 'output www.b.com' });

      // Nothing painted yet - frames are never delivered.
      expect(hostA.textContent).toBe('');
      expect(hostB.textContent).toBe('');

      // The watchdog force-paints both outputs once it detects the starvation.
      jest.advanceTimersByTime(200);

      expect(hostA.textContent).toBe('output www.a.com');
      expect(hostB.textContent).toBe('output www.b.com');
      expect(hostA.querySelectorAll('a')).toHaveLength(1);
      expect(hostB.querySelectorAll('a')).toHaveLength(1);

      hostA.remove();
      hostB.remove();
    });

    it('waits for the host to be attached before painting, then paints', async () => {
      // Outputs are rendered before being inserted into the DOM; under load the
      // notebook can still be laying out when the first frame / fallback fires.
      // The render must wait for the host to attach rather than give up (which
      // would lose the first paint while synchronously-rendered siblings still
      // appear).
      const detached = document.createElement('div');
      const sanitizer = new Sanitizer();

      void renderText({
        host: detached,
        sanitizer,
        source: 'see www.example.com here'
      });

      // Drive several frames / fallback ticks while still detached.
      jest.advanceTimersByTime(500);
      expect(detached.textContent).toBe('');

      // Attach the host; the render should now complete.
      document.body.appendChild(detached);
      jest.runAllTimers();

      expect(detached.textContent).toBe('see www.example.com here');
      expect(detached.querySelectorAll('a')).toHaveLength(1);

      detached.remove();
    });

    it('does not leak intersection observers while streaming', async () => {
      const disconnect = jest.spyOn(
        window.IntersectionObserver.prototype,
        'disconnect'
      );
      const sanitizer = new Sanitizer();

      // Simulate three stream chunks arriving before any frame is rendered
      // (each new chunk cancels the pending frame of the previous one).
      await renderText({ host, sanitizer, source: 'aaa www.' });
      await renderText({ host, sanitizer, source: 'aaa www.example.com bbb' });
      await renderText({
        host,
        sanitizer,
        source: 'aaa www.example.com bbb www.example.org'
      });

      // The observers of the two superseded renders must have been disconnected;
      // previously one observer was leaked per stream chunk.
      expect(disconnect).toHaveBeenCalledTimes(2);
    });

    it('renders synchronously when incremental auto-linking is disabled', async () => {
      const sanitizer = new Sanitizer();
      // Escape hatch: fall back to the legacy synchronous pipeline.
      sanitizer.setIncrementalAutolink(false);

      // Fail loudly if the synchronous path relies on animation frames.
      const raf = jest
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation(() => {
          throw new Error('synchronous rendering must not schedule a frame');
        });

      await renderText({ host, sanitizer, source: 'see www.example.com here' });

      // The content (text and links) is present immediately, without a frame.
      expect(host.textContent).toBe('see www.example.com here');
      expect(host.querySelectorAll('a')).toHaveLength(1);
      expect(raf).not.toHaveBeenCalled();
    });

    it('does not crash when a frame boundary falls right after a URL', async () => {
      // Regression test for the auto-link cache: each rendering frame requires
      // a usable cache from the previous frame. When a frame ends right after a
      // linkified URL (a URL followed by a space, not a newline) the last
      // cached node is an anchor; the cache logic must be able to reuse it
      // rather than bailing out, otherwise the next frame throws.
      const sanitizer = new Sanitizer();

      // Force the 10ms per-frame budget to be exceeded after each fragment so
      // the render spans several frames, with the first boundary landing right
      // after the URL `www.example.com`.
      let clock = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => (clock += 1000));

      await renderText({
        host,
        sanitizer,
        source: 'www.example.com and more text'
      });
      jest.runAllTimers();

      expect(host.textContent).toBe('www.example.com and more text');
      const anchors = host.querySelectorAll('a');
      expect(anchors).toHaveLength(1);
      expect(anchors[0].textContent).toBe('www.example.com');
    });

    it('keeps a single anchor when a streamed URL grows by appended path characters', async () => {
      // The first chunk ends exactly on the URL (the last cached node is an
      // anchor); the second chunk appends path characters directly onto it,
      // with no whitespace in between. The cache must drop the trailing anchor
      // and re-linkify it together with the addition into one extended link.
      const sanitizer = new Sanitizer();

      await renderText({ host, sanitizer, source: 'see www.example.com' });
      jest.runAllTimers();
      await renderText({
        host,
        sanitizer,
        source: 'see www.example.com/path/page'
      });
      jest.runAllTimers();

      expect(host.textContent).toBe('see www.example.com/path/page');
      const anchors = host.querySelectorAll('a');
      expect(anchors).toHaveLength(1);
      expect(anchors[0].textContent).toBe('www.example.com/path/page');
    });

    it('linkifies a URL inside ANSI-colored text when the anchor arrives in a later frame', async () => {
      // Regression test for the DOM diffing in `replaceChangedNodes`: after
      // the first frame paints the colored span with the URL not yet
      // linkified, a later frame produces an anchor wrapping that span. The
      // old `<span>` and the new `<a>` are both elements with identical
      // `textContent`, so a diff comparing only `nodeType` and `textContent`
      // would treat them as unchanged and silently drop the link (while the
      // cache records it as rendered, so it would never be retried).
      const sanitizer = new Sanitizer();

      // Exhaust the first frame's time budget after a single word fragment
      // ('see'), so the colored URL paints unlinked; subsequent frames get an
      // effectively unlimited budget and complete the auto-linking.
      let calls = 0;
      let clock = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => {
        calls += 1;
        // Call 1 is the first frame's start, call 2 its first budget check.
        clock += calls <= 2 ? 1000 : 0.01;
        return clock;
      });

      await renderText({
        host,
        sanitizer,
        source: 'see \x1b[0;31mwww.example.com\x1b[0m more'
      });
      jest.runAllTimers();

      expect(host.textContent).toBe('see www.example.com more');
      const anchors = host.querySelectorAll('a');
      expect(anchors).toHaveLength(1);
      expect(anchors[0].textContent).toBe('www.example.com');
      // The ANSI coloring is preserved inside the link.
      expect(anchors[0].querySelector('span')).not.toBeNull();
    });

    // Selection preservation across streamed re-renders. `replaceChangedNodes`
    // records the selection as character offsets before mutating the DOM and
    // restores it afterwards. jsdom's `Selection.containsNode` always returns
    // `false`, which would short-circuit that path, so it is stubbed to `true`
    // (matching a real browser where the selection is inside the output host).
    it('preserves a selection starting at the first character of a linkified URL', async () => {
      // Regression test: the selection-offset code must treat a character
      // offset of 0 as a real position. Selecting from the very start of a
      // linkified URL exercises both the save path (a nested offset of 0,
      // previously discarded by a truthiness check) and the restore path
      // (locating offset 0, previously missed by a strict `>` comparison).
      jest.spyOn(Selection.prototype, 'containsNode').mockReturnValue(true);
      const sanitizer = new Sanitizer();

      await renderText({ host, sanitizer, source: 'www.example.com and more' });
      jest.runAllTimers();

      const urlText = host.querySelector('a')!.firstChild as Text;
      const selection = window.getSelection()!;
      selection.setBaseAndExtent(urlText, 0, urlText, 5);
      expect(selection.toString()).toBe('www.e');

      // A further stream chunk rebuilds the DOM; the selection must survive.
      await renderText({
        host,
        sanitizer,
        source: 'www.example.com and more text'
      });
      jest.runAllTimers();

      const restored = window.getSelection()!;
      expect(restored.isCollapsed).toBe(false);
      expect(restored.toString()).toBe('www.e');
    });

    it('preserves a mid-content selection across a streamed append', async () => {
      // Baseline: an offset strictly inside a node (away from any boundary) is
      // preserved. Complements the offset-0 case above.
      jest.spyOn(Selection.prototype, 'containsNode').mockReturnValue(true);
      const sanitizer = new Sanitizer();

      await renderText({ host, sanitizer, source: 'www.example.com and more' });
      jest.runAllTimers();

      // Select "example", strictly inside the linkified URL text node.
      const urlText = host.querySelector('a')!.firstChild as Text;
      const selection = window.getSelection()!;
      selection.setBaseAndExtent(urlText, 4, urlText, 11);
      expect(selection.toString()).toBe('example');

      await renderText({
        host,
        sanitizer,
        source: 'www.example.com and more text'
      });
      jest.runAllTimers();

      expect(window.getSelection()!.toString()).toBe('example');
    });
  });
});
