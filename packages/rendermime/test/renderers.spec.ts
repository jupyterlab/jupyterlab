// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Sanitizer } from '@jupyterlab/apputils';
import { renderText } from '@jupyterlab/rendermime';

// Keep in sync with `AUTO_LINK_STRIDE` in `src/renderers.ts`: each incremental
// auto-linking step advances to the first whitespace at or after this offset.
// Tests that need a render to span several steps/frames pad their sources
// beyond the stride.
const STRIDE = 8192;

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

    it('clears the first-paint watchdog when a never-attached host gives up', async () => {
      // A host that is discarded before ever being attached (e.g. a completer
      // documentation node replaced while typing) stops rendering after a
      // bounded number of frames. The first-paint watchdog must be cleared on
      // that path too. The leak only shows while animation frames keep being
      // produced (a healthy foreground tab): the watchdog then never
      // force-paints (it only acts under frame starvation) and instead keeps
      // re-arming its timer - and strongly referencing the host - forever. A
      // second, still-rendering host keeps the frames alive here; without it
      // the very next tick would see the frames as starved, force-paint into
      // the give-up path and dissolve on its own, masking the leak.
      const sanitizer = new Sanitizer();
      const neverAttached = document.createElement('div');
      const laterStarted = document.createElement('div');

      void renderText({
        host: neverAttached,
        sanitizer,
        source: 'see www.example.com here'
      });

      // Let the first render burn through half of its allotted frames, then
      // start the second one so that it is still producing frames (each host
      // gets ~1000 frames at ~16ms per fake-timer frame) when the first gives
      // up.
      jest.advanceTimersByTime(8000);
      void renderText({
        host: laterStarted,
        sanitizer,
        source: 'other www.example.org output'
      });

      // Advance to a point where the first render has given up while the
      // second is still running.
      jest.advanceTimersByTime(13000);
      expect(neverAttached.textContent).toBe('');

      // Only the second render's timers may remain: its frame request and its
      // watchdog. A third pending timer is the first render's leaked watchdog.
      expect(jest.getTimerCount()).toBe(2);
    });

    it('reuses a single persistent intersection observer while streaming', async () => {
      const disconnect = jest.spyOn(
        window.IntersectionObserver.prototype,
        'disconnect'
      );
      // Count constructions; the pass-through implementation is needed because
      // the environment's IntersectionObserver is a class (jest's default
      // pass-through would invoke it without `new`).
      const RealIntersectionObserver = window.IntersectionObserver;
      const ctor = jest
        .spyOn(window, 'IntersectionObserver')
        .mockImplementation(
          (
            callback: IntersectionObserverCallback,
            options?: IntersectionObserverInit
          ) => new RealIntersectionObserver(callback, options)
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

      // A single observer is created on the first chunk and reused afterwards;
      // previously each chunk created (and had to disconnect) its own.
      expect(ctor).toHaveBeenCalledTimes(1);
      expect(disconnect).not.toHaveBeenCalled();
    });

    it('keeps auto-linking an off-screen output in the background during idle time', async () => {
      // Once an output has painted and scrolls off-screen, it is parked in the
      // background tier: it must stop consuming animation frames (previously
      // it kept re-scheduling frames at the display refresh rate without doing
      // any work), yet still make progress during browser idle time
      // (requestIdleCallback, or its timer fallback) until fully rendered - so
      // that scrolling back lands on already-linkified content and the
      // pipeline reaches quiescence.
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
      const raf = jest.spyOn(window, 'requestAnimationFrame');

      // Exhaust the first frame's budget after a single auto-linking step (the
      // stride-sized padding before the URL) so that linkification of the URL
      // is still pending when the output goes off-screen; later slices get an
      // effectively unlimited budget.
      let calls = 0;
      let clock = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => {
        calls += 1;
        clock += calls <= 2 ? 1000 : 0.01;
        return clock;
      });

      const sanitizer = new Sanitizer();
      const source = `${'x'.repeat(STRIDE + 8)} www.example.com more`;
      await renderText({ host, sanitizer, source });

      // First frame: the full text paints, but the URL is not linkified yet.
      jest.advanceTimersByTime(16);
      expect(host.textContent).toBe(source);
      expect(host.querySelectorAll('a')).toHaveLength(0);

      // The output scrolls off-screen; the next animation frame parks it in
      // the background tier.
      observerCallback!(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
      jest.advanceTimersByTime(16);
      const rafCallsWhenParked = raf.mock.calls.length;

      // Background (idle) slices finish the auto-linking without a single
      // further animation frame being requested.
      jest.advanceTimersByTime(300);
      expect(host.querySelectorAll('a')).toHaveLength(1);
      expect(raf.mock.calls.length).toBe(rafCallsWhenParked);

      // The pipeline is quiescent: no frame requests, no idle slices pending.
      expect(jest.getTimerCount()).toBe(0);
    });

    it('promotes an off-screen output back to animation frames when it becomes visible', async () => {
      // A host parked in the background tier must resume at full rate as soon
      // as it scrolls back into view, without waiting for the browser to go
      // idle (idle callbacks can be delayed indefinitely on a busy page).
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

      // Same budget shape as above: one auto-linking step in the first frame,
      // unlimited afterwards.
      let calls = 0;
      let clock = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => {
        calls += 1;
        clock += calls <= 2 ? 1000 : 0.01;
        return clock;
      });

      const sanitizer = new Sanitizer();
      const source = `${'x'.repeat(STRIDE + 8)} www.example.com more`;
      await renderText({ host, sanitizer, source });

      // Paint the first frame, then park the host in the background tier.
      jest.advanceTimersByTime(16);
      observerCallback!(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
      jest.advanceTimersByTime(16);
      expect(host.querySelectorAll('a')).toHaveLength(0);

      // The output scrolls back into view: rendering completes on animation
      // frames, well before the first background (idle) slice - which in the
      // requestIdleCallback fallback would only run after 100ms - could fire.
      observerCallback!(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
      jest.advanceTimersByTime(48);
      expect(host.querySelectorAll('a')).toHaveLength(1);
      expect(host.querySelector('a')!.textContent).toBe('www.example.com');
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

      // Force the 10ms per-frame budget to be exceeded after each auto-linking
      // step so the render spans several frames.
      let clock = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => (clock += 1000));

      // Place the URL so that the first step's break point (the first
      // whitespace at or after the stride) is the space right after the URL:
      // the space before the URL falls at `STRIDE - 7 < STRIDE`, the URL spans
      // the stride offset, and the next whitespace follows the URL.
      const padding = 'y'.repeat(STRIDE - 7);
      const source = `${padding} www.example.com and more text`;
      await renderText({ host, sanitizer, source });
      jest.runAllTimers();

      expect(host.textContent).toBe(source);
      const anchors = host.querySelectorAll('a');
      expect(anchors).toHaveLength(1);
      expect(anchors[0].textContent).toBe('www.example.com');
    });

    it('renders a whitespace-free output larger than the stride in one step', async () => {
      // With no whitespace there is no safe break point, so a single step must
      // swallow the whole text (splitting mid-token could split a URL).
      const sanitizer = new Sanitizer();
      const source = 'z'.repeat(STRIDE * 3);

      await renderText({ host, sanitizer, source });
      jest.runAllTimers();

      expect(host.textContent).toBe(source);
      expect(host.querySelectorAll('a')).toHaveLength(0);
    });

    it('makes progress when a huge unbroken token exhausts every frame budget', async () => {
      // Regression test for a cross-frame livelock: when the frame budget is
      // exhausted by a single step whose text ends in one huge node, deriving
      // the next frame's state from the auto-link cache (which drops and
      // re-analyses the trailing node) would redo the exact same step forever.
      // The render must instead carry its progress across frames, so the URL
      // after the token still gets linkified.
      const sanitizer = new Sanitizer();

      // Every budget check fails, so each frame performs exactly one step; the
      // first step consumes the token, the next must handle the URL.
      let clock = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => (clock += 1000));

      const source = `${'z'.repeat(STRIDE * 2)} www.example.com`;
      await renderText({ host, sanitizer, source });
      jest.runAllTimers();

      expect(host.textContent).toBe(source);
      const anchors = host.querySelectorAll('a');
      expect(anchors).toHaveLength(1);
      expect(anchors[0].textContent).toBe('www.example.com');
    });

    it('round-robins frames between multiple visible outputs until both complete', async () => {
      // Two multi-frame renders share the per-frame render queue; the rotation
      // must let both make progress and finish (neither may starve the other).
      const sanitizer = new Sanitizer();
      const hostA = document.createElement('div');
      const hostB = document.createElement('div');
      document.body.appendChild(hostA);
      document.body.appendChild(hostB);

      // Every budget check fails: one auto-linking step per frame.
      let clock = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => (clock += 1000));

      const sourceA = `${'a'.repeat(STRIDE + 8)} www.example.com tail`;
      const sourceB = `${'b'.repeat(STRIDE + 8)} www.example.org tail`;
      void renderText({ host: hostA, sanitizer, source: sourceA });
      void renderText({ host: hostB, sanitizer, source: sourceB });
      jest.runAllTimers();

      expect(hostA.textContent).toBe(sourceA);
      expect(hostB.textContent).toBe(sourceB);
      expect(hostA.querySelectorAll('a')).toHaveLength(1);
      expect(hostB.querySelectorAll('a')).toHaveLength(1);

      hostA.remove();
      hostB.remove();
    });

    it('keeps the default frame budget when sharing frames with another output', async () => {
      // Two outputs render concurrently, so neither renders in two consecutive
      // frames: the gap a host observes between its own working frames is
      // dominated by the other host's turns, not by the browser-side cost of
      // its own insertions, and must not inflate the adaptive frame budget -
      // otherwise concurrently rendering outputs escalate each other's budgets
      // up to `MAX_FRAME_BUDGET` and every frame turns janky.
      //
      // Simulate a browser where `performance.now` and animation-frame
      // timestamps share one clock (as in reality): each `performance.now`
      // call advances the clock by 11ms - so at the default 10ms budget every
      // working frame fits exactly one auto-linking step - and each frame is
      // delivered at the next 16ms vsync after the current clock.
      let clock = 5;
      jest.spyOn(performance, 'now').mockImplementation(() => (clock += 11));
      const pending = new Map<number, FrameRequestCallback>();
      let rafId = 0;
      jest
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((callback: FrameRequestCallback) => {
          rafId += 1;
          pending.set(rafId, callback);
          return rafId;
        });
      jest
        .spyOn(window, 'cancelAnimationFrame')
        .mockImplementation((handle: number) => {
          pending.delete(handle);
        });
      const runFrame = () => {
        clock = Math.ceil(clock / 16) * 16;
        const timestamp = clock;
        const callbacks = [...pending.values()];
        pending.clear();
        for (const callback of callbacks) {
          callback(timestamp);
        }
      };

      const sanitizer = new Sanitizer();
      const hostA = document.createElement('div');
      const hostB = document.createElement('div');
      document.body.appendChild(hostA);
      document.body.appendChild(hostB);
      // Six steps each: five stride-sized chunks and the trailing URL.
      const sourceA = `${('a'.repeat(STRIDE) + ' ').repeat(5)}www.example.com`;
      const sourceB = `${('b'.repeat(STRIDE) + ' ').repeat(5)}www.example.org`;
      void renderText({ host: hostA, sanitizer, source: sourceA });
      void renderText({ host: hostB, sanitizer, source: sourceB });

      // Eight frames: four working frames per host - four steps out of the
      // six each needs. A host inflating its budget from a gap spanning the
      // other host's turns would run several steps per frame and its trailing
      // URL would be linkified already.
      for (let frame = 0; frame < 8; frame++) {
        runFrame();
      }
      expect(hostA.textContent).toBe(sourceA);
      expect(hostB.textContent).toBe(sourceB);
      expect(hostA.querySelectorAll('a')).toHaveLength(0);
      expect(hostB.querySelectorAll('a')).toHaveLength(0);

      // Both still finish in due course.
      for (let frame = 0; frame < 20 && pending.size > 0; frame++) {
        runFrame();
      }
      expect(hostA.querySelectorAll('a')).toHaveLength(1);
      expect(hostB.querySelectorAll('a')).toHaveLength(1);

      hostA.remove();
      hostB.remove();
    });

    it('serves multiple parked outputs within a single idle slice', async () => {
      // Two outputs park in the background tier; one idle callback must drive
      // both to completion (round-robin over the idle queue while the deadline
      // allows), without requesting further animation frames.
      const callbacks: IntersectionObserverCallback[] = [];
      jest
        .spyOn(window, 'IntersectionObserver')
        .mockImplementation((cb: IntersectionObserverCallback) => {
          callbacks.push(cb);
          return {
            observe: () => undefined,
            unobserve: () => undefined,
            disconnect: () => undefined,
            takeRecords: () => []
          } as unknown as IntersectionObserver;
        });
      const raf = jest.spyOn(window, 'requestAnimationFrame');

      // The first working frame of each output busts its budget after one
      // step (three `performance.now` calls per animation frame: start, the
      // budget check, and the frame-end stamp; two frames), leaving the URLs
      // unlinked; afterwards the budget is effectively unlimited.
      let calls = 0;
      let clock = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => {
        calls += 1;
        clock += calls <= 6 ? 1000 : 0.01;
        return clock;
      });

      const sanitizer = new Sanitizer();
      const hostA = document.createElement('div');
      const hostB = document.createElement('div');
      document.body.appendChild(hostA);
      document.body.appendChild(hostB);
      const sourceA = `${'a'.repeat(STRIDE + 8)} www.example.com more`;
      const sourceB = `${'b'.repeat(STRIDE + 8)} www.example.org more`;
      void renderText({ host: hostA, sanitizer, source: sourceA });
      void renderText({ host: hostB, sanitizer, source: sourceB });

      // Two frames: each output paints its text (one budget-busted step each).
      jest.advanceTimersByTime(32);
      expect(hostA.textContent).toBe(sourceA);
      expect(hostB.textContent).toBe(sourceB);
      expect(hostA.querySelectorAll('a')).toHaveLength(0);
      expect(hostB.querySelectorAll('a')).toHaveLength(0);

      // Both outputs scroll off-screen and park in the background tier.
      for (const cb of callbacks) {
        cb(
          [{ isIntersecting: false } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      }
      jest.advanceTimersByTime(16);
      const rafCallsWhenParked = raf.mock.calls.length;

      // A single idle slice (the 100ms timer fallback) completes both.
      jest.advanceTimersByTime(300);
      expect(hostA.querySelectorAll('a')).toHaveLength(1);
      expect(hostB.querySelectorAll('a')).toHaveLength(1);
      expect(raf.mock.calls.length).toBe(rafCallsWhenParked);
      expect(jest.getTimerCount()).toBe(0);

      hostA.remove();
      hostB.remove();
    });

    it('never touches already-committed content on subsequent frames', async () => {
      // The append-only commit path must leave committed (linkified) content
      // alone: the anchor from an early frame stays the same DOM object, and
      // foreign mutations of committed content - like the `<mark>` elements
      // injected by search highlighting - survive later frames instead of
      // being wiped by a rebuild.
      const sanitizer = new Sanitizer();

      // Every budget check fails: one auto-linking step per frame. The first
      // step's break point lands right after the first URL.
      let clock = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => (clock += 1000));

      const source = `${'y'.repeat(STRIDE - 7)} www.example.com ${'z'.repeat(
        STRIDE
      )} www.example.org end`;
      await renderText({ host, sanitizer, source });

      // First frame: the first URL is committed.
      jest.advanceTimersByTime(16);
      const anchor = host.querySelector('a');
      expect(anchor).not.toBeNull();
      expect(anchor!.textContent).toBe('www.example.com');

      // Simulate search highlighting inside the committed region: split the
      // leading committed text node and wrap a piece in a `<mark>`.
      const pre = host.querySelector('pre')!;
      const committedText = pre.firstChild as Text;
      const piece = committedText.splitText(2);
      const mark = document.createElement('mark');
      pre.replaceChild(mark, piece);
      mark.appendChild(piece);

      // Let the render complete.
      jest.runAllTimers();

      expect(host.textContent).toBe(source);
      const anchors = host.querySelectorAll('a');
      expect(anchors).toHaveLength(2);
      // Identity: the committed anchor was never replaced.
      expect(anchors[0]).toBe(anchor);
      // The highlight survived the remaining frames.
      expect(mark.isConnected).toBe(true);
    });

    it('recovers when another component mutates the not-yet-rendered tail', async () => {
      // Nodes tracked by the renderer can be split or merged under it (search
      // highlighting while a large output is still rendering). When its
      // bookkeeping no longer matches the DOM, the renderer must rebuild and
      // still produce the correct final output rather than crash or corrupt.
      const sanitizer = new Sanitizer();

      let clock = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => (clock += 1000));

      const source = `${'y'.repeat(STRIDE - 7)} www.example.com ${'z'.repeat(
        STRIDE
      )} www.example.org end`;
      await renderText({ host, sanitizer, source });
      jest.advanceTimersByTime(16);
      expect(host.querySelectorAll('a')).toHaveLength(1);

      // Simulate search highlighting inside the tail: split the last tail
      // segment and wrap a piece of it in a `<mark>`.
      const pre = host.querySelector('pre')!;
      const tailText = pre.lastChild as Text;
      const piece = tailText.splitText(4);
      const mark = document.createElement('mark');
      pre.replaceChild(mark, piece);
      mark.appendChild(piece);

      jest.runAllTimers();

      expect(host.textContent).toBe(source);
      expect(host.querySelectorAll('a')).toHaveLength(2);
    });

    it('preserves committed search highlights when the tail is mutated mid-render', async () => {
      // Recovery from a foreign tail mutation must not touch the committed
      // region: only the tail is rebuilt, so highlights applied to already
      // rendered content (e.g. by search) survive. Rebuilding everything
      // would wipe them on every frame while search and rendering overlap.
      const sanitizer = new Sanitizer();

      let clock = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => (clock += 1000));

      const source = `${'y'.repeat(STRIDE)} ${'z'.repeat(
        STRIDE
      )} www.example.org end`;
      await renderText({ host, sanitizer, source });
      jest.advanceTimersByTime(16);

      const pre = host.querySelector('pre')!;
      // Highlight inside the committed region, the way search does: split the
      // committed text node and wrap a piece of it in a `<mark>`.
      const committedText = pre.firstChild as Text;
      const committedPiece = committedText.splitText(4);
      committedPiece.splitText(6);
      const committedMark = document.createElement('mark');
      pre.replaceChild(committedMark, committedPiece);
      committedMark.appendChild(committedPiece);
      // And the same inside the tail, invalidating the bookkeeping of the
      // segment the next commit consumes.
      const tailText = pre.lastChild as Text;
      const tailPiece = tailText.splitText(4);
      const tailMark = document.createElement('mark');
      pre.replaceChild(tailMark, tailPiece);
      tailMark.appendChild(tailPiece);

      jest.runAllTimers();

      // Rendering recovered and completed...
      expect(host.textContent).toBe(source);
      expect(host.querySelectorAll('a')).toHaveLength(1);
      // ...without touching the committed highlight.
      expect(committedMark.isConnected).toBe(true);
      expect(committedMark.textContent).toBe('yyyyyy');
    });

    it('falls back to a full rebuild when the committed region no longer matches', async () => {
      // The tail-only recovery verifies the committed region still holds
      // exactly the committed prefix of the source; when a foreign mutation
      // altered it, restoring a pristine tail next to corrupted committed
      // content would produce an inconsistent output - the renderer must
      // rebuild from scratch and still converge on the correct content.
      const sanitizer = new Sanitizer();

      let clock = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => (clock += 1000));

      const source = `${'y'.repeat(STRIDE)} ${'z'.repeat(
        STRIDE
      )} www.example.org end`;
      await renderText({ host, sanitizer, source });
      jest.advanceTimersByTime(16);

      const pre = host.querySelector('pre')!;
      // Damage the committed region (drop a committed character)...
      (pre.firstChild as Text).deleteData(0, 1);
      // ...and the tail bookkeeping, forcing recovery on the next commit.
      (pre.lastChild as Text).splitText(4);

      jest.runAllTimers();

      expect(host.textContent).toBe(source);
      expect(host.querySelectorAll('a')).toHaveLength(1);
    });

    it('shows ANSI colors in not-yet-linkified tail content', async () => {
      // The tail (text painted but not yet linkified) is derived from the
      // source-formatted nodes, so ANSI coloring must be visible from the
      // first paint rather than popping in when auto-linking reaches it.
      const sanitizer = new Sanitizer();

      let clock = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => (clock += 1000));

      const padding = 'x'.repeat(STRIDE + 8);
      const source = `${padding} \x1b[0;31mcolored www.example.com\x1b[0m`;
      await renderText({ host, sanitizer, source });

      // First frame: only the padding is committed; the colored region is
      // still tail - yet its span (with the ANSI class) must be present.
      jest.advanceTimersByTime(16);
      expect(host.querySelectorAll('a')).toHaveLength(0);
      const tailSpan = host.querySelector('pre span');
      expect(tailSpan).not.toBeNull();
      expect(tailSpan!.textContent).toContain('colored');

      jest.runAllTimers();
      expect(host.querySelectorAll('a')).toHaveLength(1);
      // The coloring is preserved within the link.
      expect(host.querySelector('a span')).not.toBeNull();
    });

    it('appends streamed chunks to the existing DOM across renders', async () => {
      // Consecutive renders (stream chunks) adopt the live DOM of the
      // previous one: content before the re-analyzed trailing region is not
      // rebuilt, so its nodes keep their identity across chunks.
      const sanitizer = new Sanitizer();

      await renderText({ host, sanitizer, source: 'line1 www.a.com\n' });
      jest.runAllTimers();
      const firstAnchor = host.querySelector('a');
      expect(firstAnchor!.textContent).toBe('www.a.com');

      // Newline chunk boundary: nothing needs re-analysis.
      await renderText({
        host,
        sanitizer,
        source: 'line1 www.a.com\nline2 www.'
      });
      jest.runAllTimers();

      // Mid-link chunk boundary: `www.` + `b.com` must form one link, which
      // requires trimming the trailing committed region back - but not the
      // first line.
      await renderText({
        host,
        sanitizer,
        source: 'line1 www.a.com\nline2 www.b.com end'
      });
      jest.runAllTimers();

      expect(host.textContent).toBe('line1 www.a.com\nline2 www.b.com end');
      const anchors = host.querySelectorAll('a');
      expect(anchors).toHaveLength(2);
      expect(anchors[1].textContent).toBe('www.b.com');
      // The first line was never rebuilt.
      expect(anchors[0]).toBe(firstAnchor);
    });

    it('leaves the DOM untouched when re-rendering identical content', async () => {
      const sanitizer = new Sanitizer();
      // A trailing newline shields the last node from re-analysis, so a
      // re-render with identical content is a complete no-op.
      const source = 'see www.example.com\n';

      await renderText({ host, sanitizer, source });
      jest.runAllTimers();
      const preBefore = host.querySelector('pre');
      const anchorBefore = host.querySelector('a');

      await renderText({ host, sanitizer, source });
      jest.runAllTimers();

      expect(host.textContent).toBe(source);
      expect(host.querySelector('pre')).toBe(preBefore);
      expect(host.querySelector('a')).toBe(anchorBefore);
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

      // Exhaust the first frame's time budget after a single auto-linking step
      // (the stride-sized padding before the URL), so the colored URL paints
      // unlinked; subsequent frames get an effectively unlimited budget and
      // complete the auto-linking.
      let calls = 0;
      let clock = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => {
        calls += 1;
        // Call 1 is the first frame's start, call 2 its first budget check.
        clock += calls <= 2 ? 1000 : 0.01;
        return clock;
      });

      const padding = 'x'.repeat(STRIDE + 8);
      await renderText({
        host,
        sanitizer,
        source: `${padding} \x1b[0;31mwww.example.com\x1b[0m more`
      });
      jest.runAllTimers();

      expect(host.textContent).toBe(`${padding} www.example.com more`);
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
