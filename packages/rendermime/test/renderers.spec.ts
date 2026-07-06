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
  });
});
