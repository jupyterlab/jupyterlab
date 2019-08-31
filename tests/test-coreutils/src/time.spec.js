'use strict';
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
exports.__esModule = true;
var chai_1 = require('chai');
var coreutils_1 = require('@jupyterlab/coreutils');
describe('@jupyterlab/coreutils', function() {
  describe('Time', function() {
    describe('.formatHuman()', function() {
      it('should convert a time to a human readable string', function() {
        var date = new Date();
        date.setSeconds(date.getSeconds() - 10);
        var value = coreutils_1.Time.formatHuman(date);
        chai_1.expect(value).to.equal('seconds ago');
        date.setMinutes(date.getMinutes() - 3);
        chai_1
          .expect(coreutils_1.Time.formatHuman(date.toISOString()))
          .to.equal('3 minutes ago');
      });
    });
    describe('.format()', function() {
      it('should convert a timestring to a date format', function() {
        chai_1.expect(coreutils_1.Time.format(new Date()).length).to.equal(16);
        var date = new Date();
        var value = coreutils_1.Time.format(date.toISOString(), 'MM-DD');
        chai_1.expect(value.length).to.equal(5);
      });
    });
  });
});
