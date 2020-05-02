// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import { Time } from '@jupyterlab/coreutils';

describe('@jupyterlab/coreutils', () => {
  describe('Time', () => {
    describe('.formatHuman()', () => {
      it('should convert a time to a human readable string', () => {
        const date = new Date();
        date.setSeconds(date.getSeconds() - 10);
        const value = Time.formatHuman(date);
        expect(value).toBe('seconds ago');
        date.setMinutes(date.getMinutes() - 3);
        expect(Time.formatHuman(date.toISOString())).toBe('3 minutes ago');
      });
    });

    describe('.format()', () => {
      it('should convert a timestring to a date format', () => {
        expect(Time.format(new Date()).length).toBe(16);
        const date = new Date();
        const value = Time.format(date.toISOString(), 'MM-DD');
        expect(value.length).toBe(5);
      });
    });
  });
});
