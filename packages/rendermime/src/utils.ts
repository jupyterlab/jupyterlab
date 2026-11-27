/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

/**
 * Number of animation frames during which a host waiting to be attached is
 * checked on every frame. After that only `notifyAttached` resumes it, so a
 * host that is never attached does not keep a frame loop running.
 */
const ATTACH_CHECK_FRAMES = 1000;

/**
 * Callbacks of hosts waiting to be attached to the document. A weak map, so a
 * host that is never attached can be garbage collected.
 */
const attachCallbacks = new WeakMap<HTMLElement, () => void>();

/**
 * Hosts checked on every animation frame, with the last frame to check them.
 * One frame callback checks them all, because a notebook can create thousands
 * of outputs before it attaches their cells.
 */
const checkedHosts = new Map<HTMLElement, number>();
let checkFrame = 0;
let checkRequest: number | null = null;

/**
 * Call `callback` once `host` is attached to the document.
 */
export function whenAttached(host: HTMLElement, callback: () => void): void {
  attachCallbacks.set(host, callback);
  checkedHosts.set(host, checkFrame + ATTACH_CHECK_FRAMES);
  if (checkRequest === null) {
    checkRequest = window.requestAnimationFrame(checkHosts);
  }
}

/**
 * Drop the callback waiting for `host` to be attached, if any.
 */
export function cancelWhenAttached(host: HTMLElement): void {
  attachCallbacks.delete(host);
  checkedHosts.delete(host);
}

/**
 * Call the callback waiting for `host` if `host` is attached.
 *
 * Renderer widgets call it when they are attached, which also covers hosts
 * that are attached after the per-frame checks have stopped.
 */
export function notifyAttached(host: HTMLElement): void {
  const callback = attachCallbacks.get(host);
  if (callback && host.isConnected) {
    cancelWhenAttached(host);
    callback();
  }
}

function checkHosts(): void {
  checkRequest = null;
  checkFrame += 1;
  for (const [host, lastFrame] of checkedHosts) {
    if (host.isConnected) {
      notifyAttached(host);
    } else if (checkFrame >= lastFrame) {
      checkedHosts.delete(host);
    }
  }
  if (checkedHosts.size > 0) {
    checkRequest = window.requestAnimationFrame(checkHosts);
  }
}
