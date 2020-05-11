// Adapted from https://github.com/bluzi/jest-retries/blob/01a9713a7379edcfd2d1bccec7c0fbc66d4602da/src/retry.js

import 'jest';

import { sleep } from './common';

/**
 * Run a test function.
 *
 * @param fn The function of the test
 */
async function runTest(fn: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const result = fn((err: Error) => (err ? reject(err) : resolve()));

    if (result && result.then) {
      result.catch(reject).then(resolve);
    } else {
      resolve();
    }
  });
}

/**
 * Run a flaky test with retries.
 *
 * @param name The name of the test
 * @param fn The function of the test
 * @param retries The number of retries
 * @param wait The time to wait in milliseconds between retries
 */
export function flakyIt(name: string, fn: any, retries = 3, wait = 1000): void {
  test(name, async () => {
    let latestError;
    for (let tries = 0; tries < retries; tries++) {
      try {
        await runTest(fn);
        return;
      } catch (error) {
        latestError = error;
        await sleep(wait);
      }
    }
    throw latestError;
  });
}

flakyIt.only = it.only;
flakyIt.skip = it.skip;
flakyIt.todo = it.todo;
