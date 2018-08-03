// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { ApplicationShell, LayoutRestorer } from '@jupyterlab/application';

import { InstanceTracker } from '@jupyterlab/apputils';

import { StateDB } from '@jupyterlab/coreutils';

import { CommandRegistry } from '@phosphor/commands';

import { PromiseDelegate } from '@phosphor/coreutils';

import { DockPanel, Widget } from '@phosphor/widgets';

const NAMESPACE = 'jupyterlab-layout-restorer-tests';

describe('apputils', () => {
  describe('LayoutRestorer', () => {
    describe('#constructor()', () => {
      it('should construct a new layout restorer', () => {
        const restorer = new LayoutRestorer({
          first: Promise.resolve<void>(void 0),
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        expect(restorer).to.be.an.instanceof(LayoutRestorer);
      });
    });

    describe('#restored', () => {
      it('should be a promise available right away', () => {
        const restorer = new LayoutRestorer({
          first: Promise.resolve<void>(void 0),
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        expect(restorer.restored).to.be.an.instanceof(Promise);
      });

      it('should resolve when restorer is done', async () => {
        const ready = new PromiseDelegate<void>();
        const restorer = new LayoutRestorer({
          first: ready.promise,
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        let promise = restorer.restored;
        ready.resolve(void 0);
        await promise;
      });
    });

    describe('#add()', () => {
      it('should add a widget to be tracked by the restorer', async () => {
        const ready = new PromiseDelegate<void>();
        const restorer = new LayoutRestorer({
          first: ready.promise,
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        const currentWidget = new Widget();
        const mode: DockPanel.Mode = 'single-document';
        const dehydrated: ApplicationShell.ILayout = {
          mainArea: { currentWidget, dock: null, mode },
          leftArea: { collapsed: true, currentWidget: null, widgets: null },
          rightArea: { collapsed: true, currentWidget: null, widgets: null }
        };
        restorer.add(currentWidget, 'test-one');
        ready.resolve(void 0);
        await restorer.restored;
        await restorer.save(dehydrated);
        const layout = await restorer.fetch();
        expect(layout.mainArea.currentWidget).to.equal(currentWidget);
        expect(layout.mainArea.mode).to.equal(mode);
      });
    });

    describe('#fetch()', () => {
      it('should always return a value', async () => {
        const restorer = new LayoutRestorer({
          first: Promise.resolve(void 0),
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        const layout = await restorer.fetch();
        expect(layout).to.not.equal(null);
      });

      it('should fetch saved data', async () => {
        const ready = new PromiseDelegate<void>();
        const restorer = new LayoutRestorer({
          first: ready.promise,
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        const currentWidget = new Widget();
        // The `fresh` attribute is only here to check against the return value.
        const dehydrated: ApplicationShell.ILayout = {
          fresh: false,
          mainArea: { currentWidget: null, dock: null, mode: null },
          leftArea: {
            currentWidget,
            collapsed: true,
            widgets: [currentWidget]
          },
          rightArea: { collapsed: true, currentWidget: null, widgets: null }
        };
        restorer.add(currentWidget, 'test-one');
        ready.resolve(void 0);
        await restorer.restored;
        await restorer.save(dehydrated);
        const layout = await restorer.fetch();
        expect(layout).to.deep.equal(dehydrated);
      });
    });

    describe('#restore()', () => {
      it('should restore the widgets in a tracker', async () => {
        const tracker = new InstanceTracker<Widget>({
          namespace: 'foo-widget'
        });
        const registry = new CommandRegistry();
        const state = new StateDB({ namespace: NAMESPACE });
        const ready = new PromiseDelegate<void>();
        const restorer = new LayoutRestorer({
          first: ready.promise,
          registry,
          state
        });
        let called = false;
        const key = `${tracker.namespace}:${tracker.namespace}`;

        registry.addCommand(tracker.namespace, {
          execute: () => {
            called = true;
          }
        });
        await state.save(key, { data: null });
        ready.resolve(undefined);
        await restorer.restore(tracker, {
          args: () => null,
          name: () => tracker.namespace,
          command: tracker.namespace
        });
        await restorer.restored;
        expect(called).to.equal(true);
      });
    });

    describe('#save()', () => {
      it('should not run before `first` promise', async () => {
        const restorer = new LayoutRestorer({
          first: new Promise(() => {
            // no op
          }),
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        const dehydrated: ApplicationShell.ILayout = {
          mainArea: { currentWidget: null, dock: null, mode: null },
          leftArea: { currentWidget: null, collapsed: true, widgets: null },
          rightArea: { collapsed: true, currentWidget: null, widgets: null }
        };
        try {
          await restorer.save(dehydrated);
        } catch (e) {
          expect(e).to.equal('save() was called prematurely.');
        }
      });

      it('should save data', async () => {
        const ready = new PromiseDelegate<void>();
        const restorer = new LayoutRestorer({
          first: ready.promise,
          registry: new CommandRegistry(),
          state: new StateDB({ namespace: NAMESPACE })
        });
        const currentWidget = new Widget();
        // The `fresh` attribute is only here to check against the return value.
        const dehydrated: ApplicationShell.ILayout = {
          fresh: false,
          mainArea: { currentWidget: null, dock: null, mode: null },
          leftArea: {
            currentWidget,
            collapsed: true,
            widgets: [currentWidget]
          },
          rightArea: { collapsed: true, currentWidget: null, widgets: null }
        };
        restorer.add(currentWidget, 'test-one');
        ready.resolve(void 0);
        await restorer.restored;
        await restorer.save(dehydrated);
        const layout = await restorer.fetch();
        expect(layout).to.deep.equal(dehydrated);
      });
    });
  });
});
