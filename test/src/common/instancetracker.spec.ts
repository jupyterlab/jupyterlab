// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  InstanceTracker
} from '../../../lib/common/instancetracker';


describe('common/instancetracker', () => {

  describe('InstanceTracker', () => {

    describe('#constructor()', () => {

      it('should create an InstanceTracker', () => {
        let tracker = new InstanceTracker<Widget>();
        expect(tracker).to.be.an(InstanceTracker);
      });

    });

    describe('#currentChanged', () => {

      it('should emit when the current widget has been updated', () => {
        let tracker = new InstanceTracker<Widget>();
        let widget = new Widget();
        let called = false;
        widget.id = 'test';
        tracker.currentChanged.connect(() => { called = true; });
        tracker.add(widget);
        expect(called).to.be(false);
        tracker.sync(widget);
        expect(called).to.be(true);
      });

    });

    describe('#currentWidget', () => {

      it('should default to null', () => {
        let tracker = new InstanceTracker<Widget>();
        expect(tracker.currentWidget).to.be(null);
      });

      it('should be updated by sync if the tracker has the widget', () => {
        let tracker = new InstanceTracker<Widget>();
        let widget = new Widget();
        widget.id = 'test';
        tracker.add(widget);
        expect(tracker.currentWidget).to.be(null);
        tracker.sync(widget);
        expect(tracker.currentWidget).to.be(widget);
      });

    });

  });

});
