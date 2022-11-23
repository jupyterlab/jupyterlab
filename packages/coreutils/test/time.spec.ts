// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Time } from '@jupyterlab/coreutils';

describe('@jupyterlab/coreutils', () => {
  describe('Time', () => {
    describe('.formatHuman()', () => {
      it('should convert a time to a human readable string', () => {
        const date = new Date();
        date.setSeconds(date.getSeconds() - 10);
        const value = Time.formatHuman(date);
        expect(value).toContain('seconds ago');
        date.setMinutes(date.getMinutes() - 3);
        expect(Time.formatHuman(date.toISOString())).toBe('3 minutes ago');
      });
    });
  });
});
