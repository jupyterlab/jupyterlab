// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { debounce } from '@jupyterlab/coreutils';

describe('debounce()', () => {
  it('should debounce a function within an interval', async () => {
    let called = 0;
    const interval = 500;
    const debounced = debounce(async () => {
      called += 1;
    }, interval);
    const one = debounced.invoke();
    const two = debounced.invoke();
    const three = debounced.invoke();
    const four = debounced.invoke();
    const five = debounced.invoke();
    await five;
    expect(called).to.equal(1);
    await four;
    expect(called).to.equal(1);
    await three;
    expect(called).to.equal(1);
    await two;
    expect(called).to.equal(1);
    await one;
    expect(called).to.equal(1);
    await debounced.invoke();
    expect(called).to.equal(2);
    await debounced.invoke();
    expect(called).to.equal(3);
  });
});
