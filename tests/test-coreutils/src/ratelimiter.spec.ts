// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { Debouncer } from '@jupyterlab/coreutils';

describe('Debouncer', () => {
  it('should debounce a function within a limit interval', async () => {
    let called = 0;
    const limit = 500;
    const debouncer = new Debouncer(async () => {
      called += 1;
    }, limit);
    const one = debouncer.invoke();
    const two = debouncer.invoke();
    const three = debouncer.invoke();
    const four = debouncer.invoke();
    const five = debouncer.invoke();
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
    await debouncer.invoke();
    expect(called).to.equal(2);
    await debouncer.invoke();
    expect(called).to.equal(3);
  });
});
