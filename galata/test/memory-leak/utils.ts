// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import type { CDPSession, Page } from '@playwright/test';

type ObjectCounts = Record<string, number>;

interface IRemoteObject {
  objectId?: string;
  type: string;
  value?: unknown;
  description?: string;
}

interface IExceptionDetails {
  text?: string;
  exception?: IRemoteObject;
}

interface IEvaluateResponse {
  result: IRemoteObject;
  exceptionDetails?: IExceptionDetails;
}

interface IQueryObjectsResponse {
  objects: IRemoteObject;
}

/**
 * Chromium DevTools based object-retention probe.
 */
export class MemoryLeakHelper {
  /**
   * Create a memory leak helper for the page.
   */
  static async create(page: IJupyterLabPageFixture): Promise<MemoryLeakHelper> {
    const playwrightPage: Page =
      (page as unknown as { page?: Page }).page ?? page;
    const cdpSession = await playwrightPage
      .context()
      .newCDPSession(playwrightPage);
    await cdpSession.send('Runtime.enable');
    await cdpSession.send('HeapProfiler.enable');
    return new MemoryLeakHelper(cdpSession);
  }

  private constructor(private readonly _session: CDPSession) {}

  /**
   * Capture the prototype for objects returned by a page expression.
   *
   * Later calls to `countObjects()` count all live objects with the same
   * prototype. The expression must return one representative object.
   */
  async capturePrototype(
    name: string,
    objectExpression: string
  ): Promise<void> {
    const response = (await this._session.send('Runtime.evaluate', {
      expression: `(() => {
        const object = (${objectExpression});
        if (object == null) {
          throw new Error(${JSON.stringify(
            `${name} expression returned no object.`
          )});
        }
        return Object.getPrototypeOf(object);
      })()`,
      objectGroup: this._objectGroup,
      returnByValue: false,
      awaitPromise: true
    })) as IEvaluateResponse;

    this._throwIfEvaluationFailed(name, response);

    if (!response.result.objectId) {
      throw new Error(
        `${name} prototype did not resolve to a remote object: ${
          response.result.description ?? response.result.type
        }`
      );
    }

    this._prototypeObjectIds.set(name, response.result.objectId);
  }

  /**
   * Count all live objects matching the captured prototypes.
   */
  async countObjects(
    names: string[] = [...this._prototypeObjectIds.keys()]
  ): Promise<ObjectCounts> {
    if (names.length === 0) {
      throw new Error('No object prototypes were captured.');
    }

    await this.collectGarbage();

    const counts: ObjectCounts = {};
    for (const name of names) {
      const prototypeObjectId = this._prototypeObjectIds.get(name);
      if (!prototypeObjectId) {
        throw new Error(`No prototype was captured for ${name}.`);
      }
      counts[name] = await this._countObjectsWithPrototype(
        name,
        prototypeObjectId
      );
    }
    return counts;
  }

  /**
   * Assert that the selected object counts return to, or below, a baseline.
   */
  async expectObjectCountsAtMost(
    expected: ObjectCounts,
    options: { names?: string[]; timeout?: number } = {}
  ): Promise<void> {
    const names = options.names ?? Object.keys(expected);
    for (const name of names) {
      if (!Object.prototype.hasOwnProperty.call(expected, name)) {
        throw new Error(`No expected count was provided for ${name}.`);
      }
    }

    await expect
      .poll(
        async () => {
          const actual = await this.countObjects(names);
          return names
            .filter(name => actual[name] > expected[name])
            .map(name => `${name}: ${actual[name]} > ${expected[name]}`)
            .join('\n');
        },
        {
          intervals: [250, 500, 1000],
          timeout: options.timeout ?? 15000,
          message: `Expected object counts not to exceed baseline for ${names.join(
            ', '
          )}`
        }
      )
      .toBe('');
  }

  /**
   * Force browser garbage collection and let disposal callbacks settle.
   */
  async collectGarbage(): Promise<void> {
    for (let i = 0; i < 2; i++) {
      await this._session.send('HeapProfiler.collectGarbage');
      await this._session.send('Runtime.evaluate', {
        expression: `new Promise(resolve => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        })`,
        returnByValue: true,
        awaitPromise: true
      });
    }
  }

  /**
   * Release DevTools handles held by this helper.
   */
  async dispose(): Promise<void> {
    try {
      await this._session.send('Runtime.releaseObjectGroup', {
        objectGroup: this._objectGroup
      });
    } catch {
      // The page may already be closing after a failed test.
    }

    try {
      await this._session.detach();
    } catch {
      // The browser may already have detached the session.
    }
  }

  private async _countObjectsWithPrototype(
    name: string,
    prototypeObjectId: string
  ): Promise<number> {
    const query = (await this._session.send('Runtime.queryObjects', {
      prototypeObjectId,
      objectGroup: this._objectGroup
    })) as IQueryObjectsResponse;

    const objectsObjectId = query.objects.objectId;
    if (!objectsObjectId) {
      throw new Error(`Runtime.queryObjects did not return ${name} objects.`);
    }

    try {
      const length = (await this._session.send('Runtime.callFunctionOn', {
        objectId: objectsObjectId,
        functionDeclaration: 'function() { return this.length; }',
        returnByValue: true
      })) as IEvaluateResponse;

      this._throwIfEvaluationFailed(name, length);

      if (typeof length.result.value !== 'number') {
        throw new Error(`Unable to count live ${name} objects.`);
      }
      return length.result.value;
    } finally {
      await this._session.send('Runtime.releaseObject', {
        objectId: objectsObjectId
      });
    }
  }

  private _throwIfEvaluationFailed(
    name: string,
    response: IEvaluateResponse
  ): void {
    const exceptionDetails = response.exceptionDetails;
    if (!exceptionDetails) {
      return;
    }

    throw new Error(
      `Unable to inspect ${name}: ${
        exceptionDetails.exception?.description ??
        exceptionDetails.exception?.value ??
        exceptionDetails.text ??
        'unknown error'
      }`
    );
  }

  private readonly _objectGroup = 'jupyterlab-memory-leak-probe';
  private readonly _prototypeObjectIds = new Map<string, string>();
}
