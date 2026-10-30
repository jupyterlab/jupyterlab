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

    describe('.formatTimestamp()', () => {
      it('should format as relative by default', () => {
        const date = new Date();
        date.setSeconds(date.getSeconds() - 10);
        const value = Time.formatTimestamp(date);
        expect(value).toContain('seconds ago');
      });

      it('should format as absolute when specified', () => {
        const date = new Date('2026-01-15T12:00:00Z');
        const value = Time.formatTimestamp(date, 'absolute');
        expect(value).toBe(Time.format(date));
      });

      it('should format as relative when specified', () => {
        const date = new Date();
        date.setMinutes(date.getMinutes() - 5);
        const value = Time.formatTimestamp(date, 'relative');
        expect(value).toBe('5 minutes ago');
      });
    });
  });
});
