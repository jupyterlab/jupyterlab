// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { InstanceTracker } from '@jupyterlab/apputils';

import { signalToPromise, testEmission } from '@jupyterlab/testutils';

import { each } from '@phosphor/algorithm';

import { Panel, Widget } from '@phosphor/widgets';

import { simulate } from 'simulate-event';

const namespace = 'instance-tracker-test';

class TestTracker<T extends Widget> extends InstanceTracker<T> {
  methods: string[] = [];

  protected onCurrentChanged(widget: T): void {
    super.onCurrentChanged(widget);
    this.methods.push('onCurrentChanged');
  }
}

function createWidget(): Widget {
  const widget = new Widget();
  widget.node.style.minHeight = '20px';
  widget.node.style.minWidth = '20px';
  widget.node.tabIndex = -1;
  return widget;
}

describe('@jupyterlab/apputils', () => {
  describe('InstanceTracker', () => {
    describe('#constructor()', () => {
      it('should create an InstanceTracker', () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        expect(tracker).to.be.an.instanceof(InstanceTracker);
      });
    });

    describe('#currentChanged', () => {
      it('should emit when the current widget has been updated', async () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        const widget = new Widget();
        widget.node.tabIndex = -1;
        let promise = signalToPromise(tracker.currentChanged);
        Widget.attach(widget, document.body);
        widget.node.focus();
        simulate(widget.node, 'focus');
        tracker.add(widget);
        await promise;
        Widget.detach(widget);
      });
    });

    describe('#widgetAdded', () => {
      it('should emit when a widget has been added', async () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        const widget = new Widget();
        let promise = signalToPromise(tracker.widgetAdded);
        tracker.add(widget);
        const [sender, args] = await promise;
        expect(args).to.equal(widget);
      });

      it('should not emit when a widget has been injected', async () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        const one = new Widget();
        const two = new Widget();
        two.node.tabIndex = -1;
        let total = 0;
        tracker.widgetAdded.connect(() => {
          total++;
        });
        let promise = testEmission(tracker.currentChanged, {
          find: () => {
            return total === 1;
          }
        });
        tracker.add(one);
        tracker.inject(two);
        Widget.attach(two, document.body);
        two.node.focus();
        simulate(two.node, 'focus');
        Widget.detach(two);
        await promise;
      });
    });

    describe('#currentWidget', () => {
      it('should default to null', () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        expect(tracker.currentWidget).to.be.null;
      });

      it('should be updated when a widget is added', () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        const widget = new Widget();
        widget.node.tabIndex = -1;
        tracker.add(widget);
        expect(tracker.currentWidget).to.equal(widget);
        widget.dispose();
      });

      it('should be updated if when the first widget is focused', () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        const panel = new Panel();
        const widget0 = createWidget();
        tracker.add(widget0);
        const widget1 = createWidget();
        tracker.add(widget1);
        panel.addWidget(widget0);
        panel.addWidget(widget1);
        Widget.attach(panel, document.body);
        expect(tracker.currentWidget).to.equal(widget1);
        widget0.node.focus();
        simulate(widget0.node, 'focus');
        expect(tracker.currentWidget).to.equal(widget0);
        panel.dispose();
        widget0.dispose();
        widget1.dispose();
      });

      it('should revert to the previously added widget on widget disposal', () => {
        const tracker = new TestTracker<Widget>({ namespace });
        const widget0 = new Widget();
        tracker.add(widget0);
        const widget1 = new Widget();
        tracker.add(widget1);
        expect(tracker.currentWidget).to.equal(widget1);
        widget1.dispose();
        expect(tracker.currentWidget).to.equal(widget0);
      });

      it('should preserve the tracked widget on widget disposal', () => {
        const panel = new Panel();
        const tracker = new InstanceTracker<Widget>({ namespace });
        const widgets = [createWidget(), createWidget(), createWidget()];
        each(widgets, widget => {
          tracker.add(widget);
          panel.addWidget(widget);
        });
        Widget.attach(panel, document.body);

        widgets[0].node.focus();
        simulate(widgets[0].node, 'focus');
        expect(tracker.currentWidget).to.equal(widgets[0]);

        let called = false;
        tracker.currentChanged.connect(() => {
          called = true;
        });
        widgets[2].dispose();
        expect(tracker.currentWidget).to.equal(widgets[0]);
        expect(called).to.equal(false);
        panel.dispose();
        each(widgets, widget => {
          widget.dispose();
        });
      });

      it('should select the previously added widget on widget disposal', () => {
        const panel = new Panel();
        const tracker = new InstanceTracker<Widget>({ namespace });
        const widgets = [createWidget(), createWidget(), createWidget()];
        each(widgets, widget => {
          tracker.add(widget);
          panel.addWidget(widget);
        });
        Widget.attach(panel, document.body);

        let called = false;
        tracker.currentChanged.connect(() => {
          called = true;
        });
        widgets[2].dispose();
        expect(tracker.currentWidget).to.equal(widgets[1]);
        expect(called).to.equal(true);
        panel.dispose();
        each(widgets, widget => {
          widget.dispose();
        });
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the tracker is disposed', () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        expect(tracker.isDisposed).to.equal(false);
        tracker.dispose();
        expect(tracker.isDisposed).to.equal(true);
      });
    });

    describe('#add()', () => {
      it('should add a widget to the tracker', () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        const widget = new Widget();
        expect(tracker.has(widget)).to.equal(false);
        tracker.add(widget);
        expect(tracker.has(widget)).to.equal(true);
      });

      it('should remove an added widget if it is disposed', () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        const widget = new Widget();
        tracker.add(widget);
        expect(tracker.has(widget)).to.equal(true);
        widget.dispose();
        expect(tracker.has(widget)).to.equal(false);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the tracker', () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        expect(tracker.isDisposed).to.equal(false);
        tracker.dispose();
        expect(tracker.isDisposed).to.equal(true);
      });

      it('should be safe to call multiple times', () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        expect(tracker.isDisposed).to.equal(false);
        tracker.dispose();
        tracker.dispose();
        expect(tracker.isDisposed).to.equal(true);
      });
    });

    describe('#find()', () => {
      it('should find a tracked item that matches a filter function', () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        const widgetA = new Widget();
        const widgetB = new Widget();
        const widgetC = new Widget();
        widgetA.id = 'A';
        widgetB.id = 'B';
        widgetC.id = 'C';
        tracker.add(widgetA);
        tracker.add(widgetB);
        tracker.add(widgetC);
        expect(tracker.find(widget => widget.id === 'B')).to.equal(widgetB);
      });

      it('should return a void if no item is found', () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        const widgetA = new Widget();
        const widgetB = new Widget();
        const widgetC = new Widget();
        widgetA.id = 'A';
        widgetB.id = 'B';
        widgetC.id = 'C';
        tracker.add(widgetA);
        tracker.add(widgetB);
        tracker.add(widgetC);
        expect(tracker.find(widget => widget.id === 'D')).to.not.be.ok;
      });
    });

    describe('#filter()', () => {
      it('should filter according to a predicate function', () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        const widgetA = new Widget();
        const widgetB = new Widget();
        const widgetC = new Widget();
        widgetA.id = 'include-A';
        widgetB.id = 'include-B';
        widgetC.id = 'exclude-C';
        tracker.add(widgetA);
        tracker.add(widgetB);
        tracker.add(widgetC);
        const list = tracker.filter(
          widget => widget.id.indexOf('include') !== -1
        );
        expect(list.length).to.equal(2);
        expect(list[0]).to.equal(widgetA);
        expect(list[1]).to.equal(widgetB);
      });

      it('should return an empty array if no item is found', () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        const widgetA = new Widget();
        const widgetB = new Widget();
        const widgetC = new Widget();
        widgetA.id = 'A';
        widgetB.id = 'B';
        widgetC.id = 'C';
        tracker.add(widgetA);
        tracker.add(widgetB);
        tracker.add(widgetC);
        expect(tracker.filter(widget => widget.id === 'D').length).to.equal(0);
      });
    });
    describe('#forEach()', () => {
      it('should iterate through all the tracked items', () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        const widgetA = new Widget();
        const widgetB = new Widget();
        const widgetC = new Widget();
        let visited = '';
        widgetA.id = 'A';
        widgetB.id = 'B';
        widgetC.id = 'C';
        tracker.add(widgetA);
        tracker.add(widgetB);
        tracker.add(widgetC);
        tracker.forEach(widget => {
          visited += widget.id;
        });
        expect(visited).to.equal('ABC');
      });
    });

    describe('#has()', () => {
      it('should return `true` if an item exists in the tracker', () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        const widget = new Widget();
        expect(tracker.has(widget)).to.equal(false);
        tracker.add(widget);
        expect(tracker.has(widget)).to.equal(true);
      });
    });

    describe('#inject()', () => {
      it('should inject a widget into the tracker', () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        const widget = new Widget();
        expect(tracker.has(widget)).to.equal(false);
        tracker.inject(widget);
        expect(tracker.has(widget)).to.equal(true);
      });

      it('should remove an injected widget if it is disposed', () => {
        const tracker = new InstanceTracker<Widget>({ namespace });
        const widget = new Widget();
        tracker.inject(widget);
        expect(tracker.has(widget)).to.equal(true);
        widget.dispose();
        expect(tracker.has(widget)).to.equal(false);
      });
    });

    describe('#onCurrentChanged()', () => {
      it('should be called when the current widget is changed', () => {
        const tracker = new TestTracker<Widget>({ namespace });
        const widget = new Widget();
        tracker.add(widget);
        expect(tracker.methods).to.contain('onCurrentChanged');
      });
    });
  });
});
