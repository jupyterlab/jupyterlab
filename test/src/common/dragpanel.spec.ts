// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Panel
} from 'phosphor/lib/ui/panel';

import {
  MimeData
} from 'phosphor/lib/core/mimedata';

import {
  IDragEvent
} from 'phosphor/lib/dom/dragdrop';

import {
  DragPanel
} from '../../../lib/common/dragpanel';

const MIME_INDEX = 'application/vnd.jupyter.dragindex';


describe('common/dragpanel', () => {

  describe('DragPanel()', () => {

    describe('#constructor', () => {

      it('should handle empty args', () => {
        let widget = new DragPanel();
        expect(widget).to.be.an(DragPanel);
        expect(widget.acceptExternalDropSource).to.be(false);
        expect(widget.childrenAreDragHandles).to.be(false);
      });

      it('should take an empty options object', () => {
        let widget = new DragPanel({});
        expect(widget).to.be.an(DragPanel);
        expect(widget.acceptExternalDropSource).to.be(false);
        expect(widget.childrenAreDragHandles).to.be(false);
      });

      it('should take an options object with optional arguments', () => {
        let widget = new DragPanel({
          childrenAreDragHandles: true,
          acceptExternalDropSource: true
         });
        expect(widget).to.be.an(DragPanel);
        expect(widget.acceptExternalDropSource).to.be(true);
        expect(widget.childrenAreDragHandles).to.be(true);
      });

      it('should add the `jp-DragPanel` class', () => {
        let widget = new DragPanel();
        expect(widget.hasClass('jp-DragPanel')).to.be(true);
      });

    });

    describe('Protected API', () => {

      // Testing UI-based thing like drag and drop is tricky at best,
      // so we instead just test using protected API of code

      class Override extends DragPanel {
        addMimeData(handle: HTMLElement, mimeData: MimeData): void {
          return super.addMimeData(handle, mimeData);
        }

        processDrop(dropTarget: HTMLElement, event: IDragEvent): void {
          return super.processDrop(dropTarget, event);
        }

        findDragTarget(handle: HTMLElement): HTMLElement {
          return super.findDragTarget(handle);
        }

        findDropTarget(input: HTMLElement, mimeData: MimeData): HTMLElement {
          return super.findDropTarget(input, mimeData);
        }

        getDragImage(handle: HTMLElement): HTMLElement {
          return super.getDragImage(handle);
        }
      }

      let simple: Override;
      let child1: Panel;
      let child2: Panel;
      let child3: Panel;
      let other: Panel;
      let dragEvent: IDragEvent;
      let stopped: boolean;

      beforeEach(function() {
        // runs before each test in this block
        simple = new Override();
        child1 = new Panel();
        child2 = new Panel();
        child3 = new Panel();
        simple.addWidget(child1);
        simple.addWidget(child2);
        simple.addWidget(child3);
        other = new Panel();

        // Partly created drag event
        dragEvent = document.createEvent('MouseEvent') as IDragEvent;
        dragEvent.initEvent('dummy', true, true);
        dragEvent.dropAction = 'none';
        dragEvent.proposedAction = 'move';
        dragEvent.supportedActions = 'move';
        dragEvent.dropAction = 'none';
        dragEvent.source = simple;
        stopped = false;
        let oldStop = dragEvent.stopPropagation;
        dragEvent.stopPropagation = () => {
          stopped = true;
          oldStop.apply(dragEvent);
        };
      });


      describe('#addMimeData', () => {

        it('should add index from handle', () => {
          simple.childrenAreDragHandles = true;
          let mimeData = new MimeData();
          simple.addMimeData(child1.node, mimeData);
          expect(mimeData.hasData(MIME_INDEX)).to.be(true);
          expect(mimeData.getData(MIME_INDEX)).to.be(0);
        });

        it('should not add anything for invalid handle', () => {
          simple.childrenAreDragHandles = true;
          let mimeData = new MimeData();
          simple.addMimeData(other.node, mimeData);
          expect(mimeData.hasData(MIME_INDEX)).to.be(false);
        });

      });

      describe('#processDrop()', () => {

        it('should move child widget down', () => {
          simple.childrenAreDragHandles = true;
          let mimeData = new MimeData();
          mimeData.setData(MIME_INDEX, 0);
          dragEvent.mimeData = mimeData;

          simple.processDrop(child3.node, dragEvent);
          expect(simple.widgets.length).to.be(3);
          // Drops insert the item *above* target
          expect(simple.widgets.at(0)).to.be(child2);
          expect(simple.widgets.at(1)).to.be(child1);
          expect(simple.widgets.at(2)).to.be(child3);
        });

        it('should stop propagation of event', () => {
          simple.childrenAreDragHandles = true;
          let mimeData = new MimeData();
          mimeData.setData(MIME_INDEX, 0);
          dragEvent.mimeData = mimeData;

          simple.processDrop(child3.node, dragEvent);
          // Check that event was processed and won't propagate:
          expect(dragEvent.defaultPrevented).to.be(true);
          expect(stopped).to.be(true);
        });

        it('should emit moved signal', () => {
          simple.childrenAreDragHandles = true;
          let mimeData = new MimeData();
          mimeData.setData(MIME_INDEX, 0);
          dragEvent.mimeData = mimeData;

          let called = false;
          simple.moved.connect((sender, args) => {
            expect(sender).to.be(simple);
            // Drops insert the item *above* target
            expect(args).to.eql({from: 0, to: 1});
            called = true;
          });
          simple.processDrop(child3.node, dragEvent);
          expect(called).to.be(true);
        });

        it('should move child widget up', () => {
          simple.childrenAreDragHandles = true;
          let mimeData = new MimeData();
          mimeData.setData(MIME_INDEX, 2);
          dragEvent.mimeData = mimeData;

          let called = false;
          simple.moved.connect((sender, args) => {
            expect(sender).to.be(simple);
            // Drops insert the item *above* target
            expect(args).to.eql({from: 2, to: 0});
            called = true;
          });
          simple.processDrop(child1.node, dragEvent);
          // Check widget moved:
          expect(simple.widgets.length).to.be(3);
          // Drops insert the item *above* target
          expect(simple.widgets.at(0)).to.be(child3);
          expect(simple.widgets.at(1)).to.be(child1);
          expect(simple.widgets.at(2)).to.be(child2);
          expect(called).to.be(true);
        });

        it('should do no-op for proposed action `\'none\'`', () => {
          // Setup
          simple.childrenAreDragHandles = true;
          let mimeData = new MimeData();
          mimeData.setData(MIME_INDEX, 2);
          dragEvent.mimeData = mimeData;
          dragEvent.proposedAction = 'none';

          let called = false;
          simple.moved.connect((sender, args) => {
            called = true;
          });

          // Call:
          simple.processDrop(child1.node, dragEvent);

          // Check that event was processed and won't propagate:
          expect(dragEvent.defaultPrevented).to.be(true);
          expect(stopped).to.be(true);
          // Check that moved was not emitted
          expect(called).to.be(false);
          // Check that order is unchanged
          expect(simple.widgets.length).to.be(3);
          expect(simple.widgets.at(0)).to.be(child1);
          expect(simple.widgets.at(1)).to.be(child2);
          expect(simple.widgets.at(2)).to.be(child3);
        });

      });

      describe('#findDragTarget', () => {

        it('should return the input when passed a valid drag target', () => {
          for (let child of [child1, child2, child3]) {
            let target = simple.findDragTarget(child.node);
            expect(target).to.be(child.node);
          }
        });

        it('should return the direct child when passed a buried handle', () => {
          child1.addWidget(other);
          let target = simple.findDragTarget(other.node);
          expect(target).to.be(child1.node);
        });

        it('should return null when passed a handle that is not a descendant', () => {
          let target = simple.findDragTarget(other.node);
          expect(target).to.be(null);
        });

        it('should return null when passed a handle that belongs to a different, non-nested drag panel', () => {
          let otherDrag = new DragPanel();
          otherDrag.addWidget(other);
          let target = simple.findDragTarget(other.node);
          expect(target).to.be(null);
        });

      });

      describe('#findDropTarget', () => {

        let mimeData = new MimeData();
        mimeData.setData(MIME_INDEX, 0);

        it('should return the input when passed a valid drop target', () => {
          for (let child of [child1, child2, child3]) {
            let target = simple.findDropTarget(child.node, mimeData);
            expect(target).to.be(child.node);
          }
        });

        it('should return the direct child when passed a buried handle', () => {
          child1.addWidget(other);
          let target = simple.findDropTarget(other.node, mimeData);
          expect(target).to.be(child1.node);
        });

        it('should return null when passed a handle that is not a descendant', () => {
          let target = simple.findDropTarget(other.node, mimeData);
          expect(target).to.be(null);
        });

        it('should return null when passed a handle that belongs to a different, non-nested drag panel', () => {
          let otherDrag = new DragPanel();
          otherDrag.addWidget(other);
          let target = simple.findDropTarget(other.node, mimeData);
          expect(target).to.be(null);
        });

        it('should return null when passed a mime bundle without needed mime type', () => {
          let otherDrag = new DragPanel();
          otherDrag.addWidget(other);
          let mimeData = new MimeData();
          mimeData.setData('text/plain', 'abc');
          let target = simple.findDropTarget(other.node, mimeData);
          expect(target).to.be(null);
        });

      });

    });

  });

});