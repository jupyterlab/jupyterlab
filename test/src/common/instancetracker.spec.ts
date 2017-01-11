// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  simulate
} from 'simulate-event';

import {
  InstanceTracker
} from '../../../lib/common/instancetracker';


const NAMESPACE = 'instance-tracker-test';


class TestTracker<T extends Widget> extends InstanceTracker<T> {
  methods: string[] = [];

  protected onCurrentChanged(): void {
    super.onCurrentChanged();
    this.methods.push('onCurrentChanged');
  }
}


describe('common/instancetracker', () => {

  describe('InstanceTracker', () => {

    describe('#constructor()', () => {

      it('should create an InstanceTracker', () => {
        let tracker = new InstanceTracker<Widget>({ namespace: NAMESPACE });
        expect(tracker).to.be.an(InstanceTracker);
      });

    });

    describe('#currentChanged', () => {

      it('should emit when the current widget has been updated', () => {
        let tracker = new InstanceTracker<Widget>({ namespace: NAMESPACE });
        let widget = new Widget({ node: document.createElement('input') });
        let called = false;
        tracker.currentChanged.connect(() => { called = true; });
        tracker.add(widget);
        Widget.attach(widget, document.body);
        expect(called).to.be(false);
        simulate(widget.node, 'focus');
        expect(called).to.be(true);
        Widget.detach(widget);
      });

    });

    describe('#currentWidget', () => {

      it('should default to null', () => {
        let tracker = new InstanceTracker<Widget>({ namespace: NAMESPACE });
        expect(tracker.currentWidget).to.be(null);
      });

      it('should be updated if when the widget is focused', () => {
        let tracker = new InstanceTracker<Widget>({ namespace: NAMESPACE });
        let widget = new Widget({ node: document.createElement('input') });
        tracker.add(widget);
        Widget.attach(widget, document.body);
        expect(tracker.currentWidget).to.be(null);
        simulate(widget.node, 'focus');
        expect(tracker.currentWidget).to.be(widget);
        Widget.detach(widget);
      });

    });

    describe('#isDisposed', () => {

      it('should test whether the tracker is disposed', () => {
        let tracker = new InstanceTracker<Widget>({ namespace: NAMESPACE });
        expect(tracker.isDisposed).to.be(false);
        tracker.dispose();
        expect(tracker.isDisposed).to.be(true);
      });

    });

    describe('#add()', () => {

      it('should add a widget to the tracker', () => {
        let tracker = new InstanceTracker<Widget>({ namespace: NAMESPACE });
        let widget = new Widget();
        expect(tracker.has(widget)).to.be(false);
        tracker.add(widget);
        expect(tracker.has(widget)).to.be(true);
      });

      it('should remove an added widget if it is disposed', () => {
        let tracker = new InstanceTracker<Widget>({ namespace: NAMESPACE });
        let widget = new Widget();
        tracker.add(widget);
        expect(tracker.has(widget)).to.be(true);
        widget.dispose();
        expect(tracker.has(widget)).to.be(false);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the tracker', () => {
        let tracker = new InstanceTracker<Widget>({ namespace: NAMESPACE });
        expect(tracker.isDisposed).to.be(false);
        tracker.dispose();
        expect(tracker.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let tracker = new InstanceTracker<Widget>({ namespace: NAMESPACE });
        expect(tracker.isDisposed).to.be(false);
        tracker.dispose();
        tracker.dispose();
        expect(tracker.isDisposed).to.be(true);
      });

    });

    describe('#find()', () => {

      it('should find a tracked item that matches a filter function', () => {
        let tracker = new InstanceTracker<Widget>({ namespace: NAMESPACE });
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

      it('should return `null` if no item is found', () => {
        let tracker = new InstanceTracker<Widget>({ namespace: NAMESPACE });
        let widgetA = new Widget();
        let widgetB = new Widget();
        let widgetC = new Widget();
        widgetA.id = 'A';
        widgetB.id = 'B';
        widgetC.id = 'C';
        tracker.add(widgetA);
        tracker.add(widgetB);
        tracker.add(widgetC);
        expect(tracker.find(widget => widget.id === 'D')).to.be(null);
      });

    });

    describe('#forEach()', () => {

      it('should iterate through all the tracked items', () => {
        let tracker = new InstanceTracker<Widget>({ namespace: NAMESPACE });
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
        let tracker = new InstanceTracker<Widget>({ namespace: NAMESPACE });
        let widget = new Widget();
        expect(tracker.has(widget)).to.be(false);
        tracker.add(widget);
        expect(tracker.has(widget)).to.be(true);
      });

    });

    describe('#onCurrentChanged()', () => {

      it('should be called when the current widget is changed', () => {
        let tracker = new TestTracker<Widget>({ namespace: NAMESPACE });
        let widget = new Widget();
        tracker.add(widget);
        expect(tracker.methods).to.not.contain('onCurrentChanged');
        Widget.attach(widget, document.body);
        simulate(widget.node, 'focus');
        expect(tracker.methods).to.contain('onCurrentChanged');
        Widget.detach(widget);
      });

    });

  });

});
