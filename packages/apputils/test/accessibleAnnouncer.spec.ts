// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { AccessibleAnnouncer } from '@jupyterlab/apputils';

describe('AccessibleAnnouncer', () => {
  let announcer: AccessibleAnnouncer;

  beforeEach(() => {
    announcer = new AccessibleAnnouncer();
  });

  afterEach(() => {
    announcer.dispose();
  });

  it('creates a polite live region', () => {
    expect(announcer.node.getAttribute('role')).toEqual('status');
    expect(announcer.node.getAttribute('aria-live')).toEqual('polite');
    expect(announcer.node.getAttribute('aria-atomic')).toEqual('true');
    expect(document.body.contains(announcer.node)).toBe(true);
  });

  it('announces messages and supports assertive priority', () => {
    announcer.announce('A polite message');
    expect(announcer.node.textContent).toEqual('A polite message');
    expect(announcer.node.getAttribute('aria-live')).toEqual('polite');

    announcer.announce('An urgent message', { assertive: true });
    expect(announcer.node.textContent).toEqual('An urgent message');
    expect(announcer.node.getAttribute('aria-live')).toEqual('assertive');
  });

  it('clears announcements after the configured timeout', () => {
    jest.useFakeTimers();
    announcer.clearTimeout = 1000;
    announcer.announce('Temporary message');

    jest.advanceTimersByTime(999);
    expect(announcer.node.textContent).toEqual('Temporary message');

    jest.advanceTimersByTime(1);
    expect(announcer.node.textContent).toEqual('');
    jest.useRealTimers();
  });

  it('does not announce when disabled', () => {
    announcer.enabled = false;
    announcer.announce('Hidden message');

    expect(announcer.node.textContent).toEqual('');
  });

  it('removes the live region on dispose', () => {
    const node = announcer.node;
    announcer.dispose();

    expect(document.body.contains(node)).toBe(false);
    expect(announcer.isDisposed).toBe(true);
  });
});
