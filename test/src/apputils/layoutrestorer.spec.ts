// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  utils
} from '@jupyterlab/services';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  Widget
} from '@phosphor/widgets';

import {
  ApplicationShell
} from '@jupyterlab/application';

import {
  InstanceTracker, LayoutRestorer
} from '@jupyterlab/apputils';

import {
  StateDB
} from '@jupyterlab/apputils';


const NAMESPACE = 'jupyterlab-layout-restorer-tests';


describe('apputils', () => {

  describe('LayoutRestorer', () => {

    describe('#constructor()', () => {

      it('should construct a new layout restorer', () => {
        let restorer = new LayoutRestorer({
          first: Promise.resolve<void>(void 0),
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        expect(restorer).to.be.a(LayoutRestorer);
      });

    });

    describe('#restored', () => {

      it('should be a promise available right away', () => {
        let restorer = new LayoutRestorer({
          first: Promise.resolve<void>(void 0),
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        expect(restorer.restored).to.be.a(Promise);
      });

      it('should resolve when restorer is done', done => {
        let ready = new utils.PromiseDelegate<void>();
        let restorer = new LayoutRestorer({
          first: ready.promise,
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        restorer.restored.then(() => { done(); }).catch(done);
        ready.resolve(void 0);
      });

    });

    describe('#add()', () => {

      it('should add a widget to be tracked by the restorer', done => {
        let ready = new utils.PromiseDelegate<void>();
        let restorer = new LayoutRestorer({
          first: ready.promise,
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        let currentWidget = new Widget();
        let dehydrated: ApplicationShell.ILayout = {
          mainArea: { currentWidget, dock: null },
          leftArea: { collapsed: true, currentWidget: null, widgets: null },
          rightArea: { collapsed: true, currentWidget: null, widgets: null }
        };
        restorer.add(currentWidget, 'test-one');
        ready.resolve(void 0);
        restorer.restored.then(() => restorer.save(dehydrated))
          .then(() => restorer.fetch())
          .then(layout => {
            expect(layout.mainArea.currentWidget).to.be(currentWidget);
            done();
          }).catch(done);
      });

    });

    describe('#fetch()', () => {

      it('should always return a value', done => {
        let restorer = new LayoutRestorer({
          first: Promise.resolve(void 0),
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        restorer.fetch().then(layout => {
          expect(layout).to.be.ok();
          done();
        }).catch(done);
      });

      it('should fetch saved data', done => {
        let ready = new utils.PromiseDelegate<void>();
        let restorer = new LayoutRestorer({
          first: ready.promise,
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        let currentWidget = new Widget();
        // The `fresh` attribute is only here to check against the return value.
        let dehydrated: ApplicationShell.ILayout = {
          fresh: false,
          mainArea: { currentWidget: null, dock: null },
          leftArea: {
            currentWidget,
            collapsed: true,
            widgets: [currentWidget]
          },
          rightArea: { collapsed: true, currentWidget: null, widgets: null }
        };
        restorer.add(currentWidget, 'test-one');
        ready.resolve(void 0);
        restorer.restored.then(() => restorer.save(dehydrated))
          .then(() => restorer.fetch())
          .then(layout => {
            expect(layout).to.eql(dehydrated);
            done();
          }).catch(done);
      });

    });

    describe('#restore()', () => {

      it('should restore the widgets in a tracker', done => {
        let tracker = new InstanceTracker<Widget>({
          namespace: 'foo-widget',
          shell: new ApplicationShell()
        });
        let registry = new CommandRegistry();
        let state = new StateDB({ namespace: NAMESPACE });
        let ready = new utils.PromiseDelegate<void>();
        let restorer = new LayoutRestorer({
          first: ready.promise, registry, state
        });
        let called = false;
        let key = `${tracker.namespace}:${tracker.namespace}`;

        registry.addCommand(tracker.namespace, {
          execute: () => { called = true; }
        });
        state.save(key, { data: null }).then(() => {
          return restorer.restore(tracker, {
            args: () => null,
            name: () => tracker.namespace,
            command: tracker.namespace
          });
        }).catch(done);
        ready.resolve(void 0);
        restorer.restored.then(() => { expect(called).to.be(true); })
          .then(() => state.remove(key))
          .then(() => { done(); })
          .catch(done);
      });

    });

    describe('#save()', () => {

      it('should not run before `first` promise', done => {
        let restorer = new LayoutRestorer({
          first: new Promise(() => { /* no op */ }),
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        let dehydrated: ApplicationShell.ILayout = {
          mainArea: { currentWidget: null, dock: null },
          leftArea: { currentWidget: null, collapsed: true, widgets: null },
          rightArea: { collapsed: true, currentWidget: null, widgets: null }
        };
        restorer.save(dehydrated)
          .then(() => { done('save() ran before `first` promise resolved.'); })
          .catch(() => { done(); });
      });

      it('should save data', done => {
        let ready = new utils.PromiseDelegate<void>();
        let restorer = new LayoutRestorer({
          first: ready.promise,
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        let currentWidget = new Widget();
        // The `fresh` attribute is only here to check against the return value.
        let dehydrated: ApplicationShell.ILayout = {
          fresh: false,
          mainArea: { currentWidget: null, dock: null },
          leftArea: {
            currentWidget,
            collapsed: true,
            widgets: [currentWidget]
          },
          rightArea: { collapsed: true, currentWidget: null, widgets: null }
        };
        restorer.add(currentWidget, 'test-one');
        ready.resolve(void 0);
        restorer.restored.then(() => restorer.save(dehydrated))
          .then(() => restorer.fetch())
          .then(layout => {
            expect(layout).to.eql(dehydrated);
            done();
          }).catch(done);
      });

    });

  });

});
