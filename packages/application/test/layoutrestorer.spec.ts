// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ILabShell } from '@jupyterlab/application';
import { LayoutRestorer } from '@jupyterlab/application';
import { WidgetTracker } from '@jupyterlab/apputils';
import { StateDB } from '@jupyterlab/statedb';
import { CommandRegistry } from '@lumino/commands';
import { PromiseDelegate } from '@lumino/coreutils';
import type { DockLayout } from '@lumino/widgets';
import { Widget } from '@lumino/widgets';

describe('apputils', () => {
  describe('LayoutRestorer', () => {
    describe('#constructor()', () => {
      it('should construct a new layout restorer', () => {
        const restorer = new LayoutRestorer({
          connector: new StateDB(),
          first: Promise.resolve<void>(void 0),
          registry: new CommandRegistry()
        });
        expect(restorer).toBeInstanceOf(LayoutRestorer);
      });
    });

    describe('#restored', () => {
      it('should be a promise available right away', () => {
        const restorer = new LayoutRestorer({
          connector: new StateDB(),
          first: Promise.resolve<void>(void 0),
          registry: new CommandRegistry()
        });
        expect(restorer.restored).toBeInstanceOf(Promise);
      });

      it('should resolve when restorer is done', async () => {
        const ready = new PromiseDelegate<void>();
        const restorer = new LayoutRestorer({
          connector: new StateDB(),
          first: ready.promise,
          registry: new CommandRegistry()
        });
        const promise = restorer.restored;
        ready.resolve(void 0);
        await expect(promise).resolves.not.toThrow();
      });
    });

    describe('#add()', () => {
      it('should add a widget in the main area to be tracked by the restorer', async () => {
        const ready = new PromiseDelegate<void>();
        const restorer = new LayoutRestorer({
          connector: new StateDB(),
          first: ready.promise,
          registry: new CommandRegistry()
        });
        const currentWidget = new Widget();
        const dehydrated: ILabShell.ILayout = {
          mainArea: { currentWidget, dock: null },
          downArea: { currentWidget: null, widgets: null, size: null },
          leftArea: {
            collapsed: true,
            currentWidget: null,
            widgets: null,
            visible: false,
            widgetStates: {
              ['null']: {
                sizes: null,
                expansionStates: null
              }
            }
          },
          rightArea: {
            collapsed: true,
            currentWidget: null,
            widgets: null,
            visible: false,
            widgetStates: {
              ['null']: {
                sizes: null,
                expansionStates: null
              }
            }
          },
          relativeSizes: null,
          topArea: { simpleVisibility: true }
        };
        restorer.add(currentWidget, 'test-one');
        ready.resolve(void 0);
        await restorer.restored;
        await restorer.save(dehydrated);
        const layout = await restorer.fetch();
        expect(layout.mainArea?.currentWidget).toBe(currentWidget);
      });

      it('should add a widget in the down area to be tracked by the restorer', async () => {
        const ready = new PromiseDelegate<void>();
        const restorer = new LayoutRestorer({
          connector: new StateDB(),
          first: ready.promise,
          registry: new CommandRegistry()
        });
        const currentWidget = new Widget();
        const dehydrated: ILabShell.ILayout = {
          mainArea: { currentWidget: null, dock: null },
          downArea: { currentWidget, widgets: null, size: null },
          leftArea: {
            collapsed: true,
            currentWidget: null,
            widgets: null,
            visible: false,
            widgetStates: {
              ['null']: {
                sizes: null,
                expansionStates: null
              }
            }
          },
          rightArea: {
            collapsed: true,
            currentWidget: null,
            widgets: null,
            visible: false,
            widgetStates: {
              ['null']: {
                sizes: null,
                expansionStates: null
              }
            }
          },
          relativeSizes: null,
          topArea: { simpleVisibility: true }
        };
        restorer.add(currentWidget, 'test-one');
        ready.resolve(void 0);
        await restorer.restored;
        await restorer.save(dehydrated);
        const layout = await restorer.fetch();
        expect(layout.downArea?.currentWidget).toBe(currentWidget);
      });
    });

    describe('#fetch()', () => {
      it('should always return a value', async () => {
        const restorer = new LayoutRestorer({
          connector: new StateDB(),
          first: Promise.resolve(void 0),
          registry: new CommandRegistry()
        });
        const layout = await restorer.fetch();
        expect(layout).not.toBe(null);
      });

      it('should fetch saved data', async () => {
        const ready = new PromiseDelegate<void>();
        const restorer = new LayoutRestorer({
          connector: new StateDB(),
          first: ready.promise,
          registry: new CommandRegistry()
        });
        const currentWidget = new Widget();
        // The `fresh` attribute is only here to check against the return value.
        const dehydrated: ILabShell.ILayout = {
          fresh: false,
          mainArea: { currentWidget: null, dock: null },
          downArea: { currentWidget: null, widgets: null, size: 0 },
          leftArea: {
            currentWidget,
            collapsed: true,
            widgets: [currentWidget],
            visible: true,
            widgetStates: {
              [currentWidget.id]: {
                sizes: null,
                expansionStates: [true]
              }
            }
          },
          rightArea: {
            collapsed: true,
            currentWidget: null,
            widgets: null,
            visible: false,
            widgetStates: {
              ['null']: {
                sizes: null,
                expansionStates: null
              }
            }
          },
          relativeSizes: null,
          topArea: { simpleVisibility: true }
        };
        restorer.add(currentWidget, 'test-one');
        ready.resolve(void 0);
        await restorer.restored;
        await restorer.save(dehydrated);
        const layout = await restorer.fetch();
        expect(layout).toEqual(dehydrated);
      });
    });

    describe('#fetch() of the main area', () => {
      const layoutWith = (
        mainArea: ILabShell.IMainArea
      ): ILabShell.ILayout => ({
        mainArea,
        downArea: { currentWidget: null, widgets: null, size: null },
        leftArea: {
          collapsed: true,
          currentWidget: null,
          widgets: null,
          visible: false,
          widgetStates: {}
        },
        rightArea: {
          collapsed: true,
          currentWidget: null,
          widgets: null,
          visible: false,
          widgetStates: {}
        },
        relativeSizes: null,
        topArea: { simpleVisibility: true }
      });

      const tabArea = (layout: ILabShell.ILayout): DockLayout.ITabAreaConfig =>
        layout.mainArea!.dock!.main as DockLayout.ITabAreaConfig;

      it('should keep the current tab when a tab before it is not tracked', async () => {
        const restorer = new LayoutRestorer({
          connector: new StateDB(),
          first: Promise.resolve(void 0),
          registry: new CommandRegistry()
        });
        const [notebook, untracked, view] = [
          new Widget(),
          new Widget(),
          new Widget()
        ];
        restorer.add(notebook, 'notebook');
        restorer.add(view, 'view');
        await restorer.restored;
        await restorer.save(
          layoutWith({
            currentWidget: view,
            dock: {
              main: {
                type: 'tab-area',
                currentIndex: 2,
                widgets: [notebook, untracked, view]
              }
            }
          })
        );
        const layout = await restorer.fetch();
        expect(tabArea(layout).widgets).toEqual([notebook, view]);
        expect(tabArea(layout).currentIndex).toBe(1);
        expect(layout.mainArea?.currentWidget).toBe(view);
      });

      it('should make the tab before an untracked current tab current', async () => {
        const restorer = new LayoutRestorer({
          connector: new StateDB(),
          first: Promise.resolve(void 0),
          registry: new CommandRegistry()
        });
        // A plugin adds a widget with no tracker on each start, after the view.
        const [notebook, view, untracked] = [
          new Widget(),
          new Widget(),
          new Widget()
        ];
        restorer.add(notebook, 'notebook');
        restorer.add(view, 'view');
        await restorer.restored;
        await restorer.save(
          layoutWith({
            currentWidget: untracked,
            dock: {
              main: {
                type: 'tab-area',
                currentIndex: 2,
                widgets: [notebook, view, untracked]
              }
            }
          })
        );
        const layout = await restorer.fetch();
        expect(tabArea(layout).widgets).toEqual([notebook, view]);
        expect(tabArea(layout).currentIndex).toBe(1);
        expect(layout.mainArea?.currentWidget).toBe(view);
      });

      it('should keep the current tab when a saved tab is not restored', async () => {
        const state = new StateDB();
        const before = new LayoutRestorer({
          connector: state,
          first: Promise.resolve(void 0),
          registry: new CommandRegistry()
        });
        const [first, gone, last] = [new Widget(), new Widget(), new Widget()];
        before.add(first, 'first');
        before.add(gone, 'gone');
        before.add(last, 'last');
        await before.restored;
        await before.save(
          layoutWith({
            currentWidget: last,
            dock: {
              main: {
                type: 'tab-area',
                currentIndex: 2,
                widgets: [first, gone, last]
              }
            }
          })
        );

        // After a reload, the widget named "gone" does not come back.
        const after = new LayoutRestorer({
          connector: state,
          first: Promise.resolve(void 0),
          registry: new CommandRegistry()
        });
        const [firstAgain, lastAgain] = [new Widget(), new Widget()];
        after.add(firstAgain, 'first');
        after.add(lastAgain, 'last');
        await after.restored;
        const layout = await after.fetch();
        expect(tabArea(layout).widgets).toEqual([firstAgain, lastAgain]);
        expect(tabArea(layout).currentIndex).toBe(1);
      });

      it('should make the tab before a current tab that is not restored current', async () => {
        const state = new StateDB();
        const before = new LayoutRestorer({
          connector: state,
          first: Promise.resolve(void 0),
          registry: new CommandRegistry()
        });
        const [first, middle, gone] = [
          new Widget(),
          new Widget(),
          new Widget()
        ];
        before.add(first, 'first');
        before.add(middle, 'middle');
        before.add(gone, 'gone');
        await before.restored;
        await before.save(
          layoutWith({
            currentWidget: gone,
            dock: {
              main: {
                type: 'tab-area',
                currentIndex: 2,
                widgets: [first, middle, gone]
              }
            }
          })
        );

        // After a reload, the current widget does not come back, as when its
        // file was deleted.
        const after = new LayoutRestorer({
          connector: state,
          first: Promise.resolve(void 0),
          registry: new CommandRegistry()
        });
        const [firstAgain, middleAgain] = [new Widget(), new Widget()];
        after.add(firstAgain, 'first');
        after.add(middleAgain, 'middle');
        await after.restored;
        const layout = await after.fetch();
        expect(tabArea(layout).currentIndex).toBe(1);
        expect(layout.mainArea?.currentWidget).toBe(middleAgain);
      });

      it('should make a tab of the same area current when the current tab is not restored', async () => {
        const state = new StateDB();
        const before = new LayoutRestorer({
          connector: state,
          first: Promise.resolve(void 0),
          registry: new CommandRegistry()
        });
        const [left, middle, gone] = [new Widget(), new Widget(), new Widget()];
        before.add(left, 'left');
        before.add(middle, 'middle');
        before.add(gone, 'gone');
        await before.restored;
        await before.save(
          layoutWith({
            currentWidget: gone,
            dock: {
              main: {
                type: 'split-area',
                orientation: 'horizontal',
                sizes: [0.5, 0.5],
                children: [
                  { type: 'tab-area', currentIndex: 0, widgets: [left] },
                  { type: 'tab-area', currentIndex: 1, widgets: [middle, gone] }
                ]
              }
            }
          })
        );

        const after = new LayoutRestorer({
          connector: state,
          first: Promise.resolve(void 0),
          registry: new CommandRegistry()
        });
        const [leftAgain, middleAgain] = [new Widget(), new Widget()];
        after.add(leftAgain, 'left');
        after.add(middleAgain, 'middle');
        await after.restored;
        const layout = await after.fetch();
        expect(layout.mainArea?.currentWidget).toBe(middleAgain);
      });

      it('should make the shown tab current when an untracked current tab is alone in its area', async () => {
        const restorer = new LayoutRestorer({
          connector: new StateDB(),
          first: Promise.resolve(void 0),
          registry: new CommandRegistry()
        });
        const [notebook, view, untracked] = [
          new Widget(),
          new Widget(),
          new Widget()
        ];
        restorer.add(notebook, 'notebook');
        restorer.add(view, 'view');
        await restorer.restored;
        await restorer.save(
          layoutWith({
            currentWidget: untracked,
            dock: {
              main: {
                type: 'split-area',
                orientation: 'horizontal',
                sizes: [0.5, 0.5],
                children: [
                  {
                    type: 'tab-area',
                    currentIndex: 1,
                    widgets: [notebook, view]
                  },
                  { type: 'tab-area', currentIndex: 0, widgets: [untracked] }
                ]
              }
            }
          })
        );
        const layout = await restorer.fetch();
        expect(layout.mainArea?.currentWidget).toBe(view);
      });
    });

    describe('#restore()', () => {
      it('should restore the widgets in a tracker', async () => {
        const tracker = new WidgetTracker({ namespace: 'foo-widget' });
        const registry = new CommandRegistry();
        const state = new StateDB();
        const ready = new PromiseDelegate<void>();
        const restorer = new LayoutRestorer({
          connector: state,
          first: ready.promise,
          registry
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
          name: () => tracker.namespace,
          command: tracker.namespace
        });
        await restorer.restored;
        expect(called).toBe(true);
      });
    });

    describe('#save()', () => {
      it('should not run before `first` promise', async () => {
        const restorer = new LayoutRestorer({
          connector: new StateDB(),
          first: new Promise(() => {
            // no op
          }),
          registry: new CommandRegistry()
        });
        const dehydrated: ILabShell.ILayout = {
          mainArea: { currentWidget: null, dock: null },
          downArea: { currentWidget: null, widgets: null, size: null },
          leftArea: {
            currentWidget: null,
            collapsed: true,
            widgets: null,
            visible: false,
            widgetStates: {
              ['null']: {
                sizes: null,
                expansionStates: null
              }
            }
          },
          rightArea: {
            collapsed: true,
            currentWidget: null,
            widgets: null,
            visible: false,
            widgetStates: {
              ['null']: {
                sizes: null,
                expansionStates: null
              }
            }
          },
          relativeSizes: null,
          topArea: { simpleVisibility: true }
        };

        await expect(restorer.save(dehydrated)).rejects.toBe(
          'save() was called prematurely.'
        );
      });

      it('should save data', async () => {
        const ready = new PromiseDelegate<void>();
        const restorer = new LayoutRestorer({
          connector: new StateDB(),
          first: ready.promise,
          registry: new CommandRegistry()
        });
        const currentWidget = new Widget();
        // The `fresh` attribute is only here to check against the return value.
        const dehydrated: ILabShell.ILayout = {
          fresh: false,
          mainArea: { currentWidget: null, dock: null },
          downArea: { currentWidget: null, widgets: null, size: 0 },
          leftArea: {
            currentWidget,
            collapsed: true,
            widgets: [currentWidget],
            visible: true,
            widgetStates: {
              [currentWidget.id]: {
                sizes: null,
                expansionStates: [true]
              }
            }
          },
          rightArea: {
            collapsed: true,
            currentWidget: null,
            widgets: null,
            visible: false,
            widgetStates: {
              ['null']: {
                sizes: null,
                expansionStates: null
              }
            }
          },
          relativeSizes: null,
          topArea: { simpleVisibility: true }
        };
        restorer.add(currentWidget, 'test-one');
        ready.resolve(void 0);
        await restorer.restored;
        await restorer.save(dehydrated);
        const layout = await restorer.fetch();
        expect(layout).toEqual(dehydrated);
      });
    });
  });
});
