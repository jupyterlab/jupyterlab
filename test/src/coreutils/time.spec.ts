// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect
} from 'chai';

import {
  Time
} from '@jupyterlab/coreutils';


describe('@jupyterlab/coreutils', () => {

  describe('Time', () => {

    describe('.formatHuman()', () => {

      it('should convert a time to a human readable string', () => {
        let date = new Date();
        date.setSeconds(date.getSeconds() - 10);
        let value = Time.formatHuman(date);
        expect(value).to.equal('seconds ago');
        date.setMinutes(date.getMinutes() - 3);
        expect(Time.formatHuman(date.toISOString())).to.equal('3 minutes ago');
      });

    });

    describe('.format()', () => {

      it('should convert a timestring to a date format', () => {
        expect(Time.format(new Date()).length).to.equal(16);
        let date = new Date();
        let value = Time.format(date.toISOString(), 'MM-DD');
        expect(value.length).to.equal(5);
      });

    });

  });

});
