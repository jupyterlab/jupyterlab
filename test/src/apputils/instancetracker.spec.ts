// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  each
} from '@phosphor/algorithm';

import {
  Panel, Widget
} from '@phosphor/widgets';

import {
  simulate
} from 'simulate-event';

import {
  ApplicationShell
} from '@jupyterlab/application';

import {
  InstanceTracker
} from '@jupyterlab/apputils';


const namespace = 'instance-tracker-test';
const shell = new ApplicationShell();


class TestTracker<T extends Widget> extends InstanceTracker<T> {
  methods: string[] = [];

  protected onCurrentChanged(widget: T): void {
    super.onCurrentChanged(widget);
    this.methods.push('onCurrentChanged');
  }
}



function createWidget(): Widget {
  let widget = new Widget();
  widget.node.style.minHeight = '20px';
  widget.node.style.minWidth = '20px';
  widget.node.tabIndex = -1;
  return widget;
}


describe('common/instancetracker', () => {

  describe('InstanceTracker', () => {

    describe('#constructor()', () => {

      it('should create an InstanceTracker', () => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        expect(tracker).to.be.an(InstanceTracker);
      });

    });

    describe('#currentChanged', () => {

      it('should emit when the current widget has been updated', () => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        let widget = new Widget();
        widget.node.tabIndex = -1;
        let called = false;
        tracker.currentChanged.connect(() => { called = true; });
        Widget.attach(widget, document.body);
        widget.node.focus();
        simulate(widget.node, 'focus');
        tracker.add(widget);
        expect(called).to.be(true);
        Widget.detach(widget);
      });

    });

    describe('#widgetAdded', () => {

      it('should emit when a widget has been added', done => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        let widget = new Widget();
        tracker.widgetAdded.connect((sender, added) => {
          expect(added).to.be(widget);
          done();
        });
        tracker.add(widget);
      });

      it('should not emit when a widget has been injected', done => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        let one = new Widget();
        let two = new Widget();
        two.node.tabIndex = -1;
        let total = 0;
        tracker.widgetAdded.connect(() => { total++; });
        tracker.currentChanged.connect(() => {
          expect(total).to.be(1);
          done();
        });
        tracker.add(one);
        tracker.inject(two);
        Widget.attach(two, document.body);
        two.node.focus();
        simulate(two.node, 'focus');
        Widget.detach(two);
      });

    });

    describe('#currentWidget', () => {

      it('should default to null', () => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        expect(tracker.currentWidget).to.be(null);
      });

      it('should be updated when a widget is added', () => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        let widget = new Widget();
        widget.node.tabIndex = -1;
        tracker.add(widget);
        expect(tracker.currentWidget).to.be(widget);
        widget.dispose();
      });

      it('should be updated if when the first widget is focused', () => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        let panel = new Panel();
        let widget0 = createWidget();
        tracker.add(widget0);
        let widget1 = createWidget();
        tracker.add(widget1);
        panel.addWidget(widget0);
        panel.addWidget(widget1);
        Widget.attach(panel, document.body);
        expect(tracker.currentWidget).to.be(widget1);
        widget0.node.focus();
        simulate(widget0.node, 'focus');
        expect(tracker.currentWidget).to.be(widget0);
        panel.dispose();
        widget0.dispose();
        widget1.dispose();
      });

      it('should revert to the previously added widget on widget disposal', () => {
        let tracker = new TestTracker<Widget>({ namespace, shell });
        let widget0 = new Widget();
        tracker.add(widget0);
        let widget1 = new Widget();
        tracker.add(widget1);
        expect(tracker.currentWidget).to.be(widget1);
        widget1.dispose();
        expect(tracker.currentWidget).to.be(widget0);
      });

      it('should preserve the tracked widget on widget disposal', () => {
        let panel = new Panel();
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        let widgets = [createWidget(), createWidget(), createWidget()];
        each(widgets, widget => {
          tracker.add(widget);
          panel.addWidget(widget);
        });
        Widget.attach(panel, document.body);

        widgets[0].node.focus();
        simulate(widgets[0].node, 'focus');
        expect(tracker.currentWidget).to.be(widgets[0]);

        let called = false;
        tracker.currentChanged.connect(() => { called = true; });
        widgets[2].dispose();
        expect(tracker.currentWidget).to.be(widgets[0]);
        expect(called).to.be(false);
        panel.dispose();
        each(widgets, widget => {
          widget.dispose();
        });
      });

      it('should select the previously added widget on widget disposal', () => {
        let panel = new Panel();
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        let widgets = [createWidget(), createWidget(), createWidget()];
        each(widgets, widget => {
          tracker.add(widget);
          panel.addWidget(widget);
        });
        Widget.attach(panel, document.body);

        let called = false;
        tracker.currentChanged.connect(() => { called = true; });
        widgets[2].dispose();
        expect(tracker.currentWidget).to.be(widgets[1]);
        expect(called).to.be(true);
        panel.dispose();
        each(widgets, widget => {
          widget.dispose();
        });
      });

    });

    describe('#isDisposed', () => {

      it('should test whether the tracker is disposed', () => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        expect(tracker.isDisposed).to.be(false);
        tracker.dispose();
        expect(tracker.isDisposed).to.be(true);
      });

    });

    describe('#add()', () => {

      it('should add a widget to the tracker', () => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        let widget = new Widget();
        expect(tracker.has(widget)).to.be(false);
        tracker.add(widget);
        expect(tracker.has(widget)).to.be(true);
      });

      it('should remove an added widget if it is disposed', () => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        let widget = new Widget();
        tracker.add(widget);
        expect(tracker.has(widget)).to.be(true);
        widget.dispose();
        expect(tracker.has(widget)).to.be(false);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the tracker', () => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        expect(tracker.isDisposed).to.be(false);
        tracker.dispose();
        expect(tracker.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        expect(tracker.isDisposed).to.be(false);
        tracker.dispose();
        tracker.dispose();
        expect(tracker.isDisposed).to.be(true);
      });

    });

    describe('#find()', () => {

      it('should find a tracked item that matches a filter function', () => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        let widgetA = new Widget();
        let widgetB = new Widget();
        let widgetC = new Widget();
        widgetA.id = 'A';
        widgetB.id = 'B';
        widgetC.id = 'C';
        tracker.add(widgetA);
        tracker.add(widgetB);
        tracker.add(widgetC);
        expect(tracker.find(widget => widget.id === 'B')).to.be(widgetB);
      });

      it('should return a void if no item is found', () => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        let widgetA = new Widget();
        let widgetB = new Widget();
        let widgetC = new Widget();
        widgetA.id = 'A';
        widgetB.id = 'B';
        widgetC.id = 'C';
        tracker.add(widgetA);
        tracker.add(widgetB);
        tracker.add(widgetC);
        expect(tracker.find(widget => widget.id === 'D')).to.not.be.ok();
      });

    });

    describe('#forEach()', () => {

      it('should iterate through all the tracked items', () => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        let widgetA = new Widget();
        let widgetB = new Widget();
        let widgetC = new Widget();
        let visited = '';
        widgetA.id = 'A';
        widgetB.id = 'B';
        widgetC.id = 'C';
        tracker.add(widgetA);
        tracker.add(widgetB);
        tracker.add(widgetC);
        tracker.forEach(widget => { visited += widget.id; });
        expect(visited).to.be('ABC');
      });

    });

    describe('#has()', () => {

      it('should return `true` if an item exists in the tracker', () => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        let widget = new Widget();
        expect(tracker.has(widget)).to.be(false);
        tracker.add(widget);
        expect(tracker.has(widget)).to.be(true);
      });

    });

    describe('#inject()', () => {

      it('should inject a widget into the tracker', () => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        let widget = new Widget();
        expect(tracker.has(widget)).to.be(false);
        tracker.inject(widget);
        expect(tracker.has(widget)).to.be(true);
      });

      it('should remove an injected widget if it is disposed', () => {
        let tracker = new InstanceTracker<Widget>({ namespace, shell });
        let widget = new Widget();
        tracker.inject(widget);
        expect(tracker.has(widget)).to.be(true);
        widget.dispose();
        expect(tracker.has(widget)).to.be(false);
      });

    });

    describe('#onCurrentChanged()', () => {

      it('should be called when the current widget is changed', () => {
        let tracker = new TestTracker<Widget>({ namespace, shell });
        let widget = new Widget();
        tracker.add(widget);
        expect(tracker.methods).to.contain('onCurrentChanged');
      });

    });

  });

});
