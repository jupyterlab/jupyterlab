// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Widget
} from '@phosphor/widgets';

import {
  simulate
} from 'simulate-event';

import {
  CSVDelimiter
} from '@jupyterlab/csvviewer';


const DELIMITERS = [',', ';', '\t'];


describe('csvviewer/toolbar', () => {

  describe('CSVDelimiter', () => {

    describe('#constructor()', () => {

      it('should instantiate a `CSVDelimiter` toolbar widget', () => {
        let widget = new CSVDelimiter({ selected: ',' });
        expect(widget).to.be.a(CSVDelimiter);
        expect(widget.node.classList).to.contain('jp-CSVDelimiter');
        widget.dispose();
      });

      it('should allow pre-selecting the delimiter', () => {
        let wanted = DELIMITERS[DELIMITERS.length - 1];
        let widget = new CSVDelimiter({ selected: wanted });
        expect(widget.selectNode.value).to.be(wanted);
        widget.dispose();
      });

    });

    describe('#delimiterChanged', () => {

      it('should emit a value when the dropdown value changes', () => {
        let widget = new CSVDelimiter({ selected: ',' });
        let delimiter = '';
        let index = DELIMITERS.length - 1;
        let wanted = DELIMITERS[index];
        widget.delimiterChanged.connect((s, value) => { delimiter = value; });
        Widget.attach(widget, document.body);
        widget.selectNode.selectedIndex = index;
        simulate(widget.selectNode, 'change');
        expect(delimiter).to.be(wanted);
        widget.dispose();
      });

    });

    describe('#selectNode', () => {

      it('should return the delimiter dropdown select tag', () => {
        let widget = new CSVDelimiter({ selected: ',' });
        expect(widget.selectNode.tagName.toLowerCase()).to.be('select');
        widget.dispose();
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new CSVDelimiter({ selected: ',' });
        expect(widget.isDisposed).to.be(false);
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new CSVDelimiter({ selected: ',' });
        expect(widget.isDisposed).to.be(false);
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

  });

});
