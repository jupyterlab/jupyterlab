// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  utils
} from '@jupyterlab/services';

import {
  CommandRegistry
} from 'phosphor/lib/ui/commandregistry';

import {
  InstanceRestorer
} from '../../../lib/instancerestorer/instancerestorer';

import {
  StateDB
} from '../../../lib/statedb/statedb';


const NAMESPACE = 'jupyterlab-instance-restorer-tests';


describe('instancerestorer/instancerestorer', () => {

  describe('InstanceRestorer', () => {

    describe('#constructor()', () => {

      it('should construct a new instance restorer', () => {
        let restorer = new InstanceRestorer({
          first: Promise.resolve<void>(void 0),
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        expect(restorer).to.be.an(InstanceRestorer);
      });

    });

    describe('#restored', () => {

      it('should be a promise available right away', () => {
        let restorer = new InstanceRestorer({
          first: Promise.resolve<void>(void 0),
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        expect(restorer.restored).to.be.a(Promise);
      });

      it('should resolve when restorer is done', done => {
        let ready = new utils.PromiseDelegate<void>();
        let restorer = new InstanceRestorer({
          first: ready.promise,
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        restorer.restored.then(() => { done(); }).catch(done);
        ready.resolve(void 0);
      });

    });

  });

});
