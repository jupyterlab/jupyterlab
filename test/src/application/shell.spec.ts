// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  simulate
} from 'simulate-event';

import {
  ApplicationShell
} from '@jupyterlab/application';


class ContentWidget extends Widget {

  activated = false;

  onActivateRequest(msg: Message): void {
    this.activated = true;
  }
}


describe('ApplicationShell', () => {

  let shell: ApplicationShell;

  beforeEach(() => {
    shell = new ApplicationShell();
    Widget.attach(shell, document.body);
  });

  afterEach(() => {
    shell.dispose();
  });

  describe('#constructor()', () => {

    it('should create an ApplicationShell instance', () => {
      expect(shell).to.be.an(ApplicationShell);
    });

  });

  describe('#currentWidget', () => {

    it('should be the current widget in the shell main area', () => {
      expect(shell.currentWidget).to.be(null);
      let widget = new Widget();
      widget.node.tabIndex = -1;
      widget.id = 'foo';
      shell.addToMainArea(widget);
      expect(shell.currentWidget).to.be(null);
      simulate(widget.node, 'focus');
      expect(shell.currentWidget).to.be(widget);
    });

  });

  describe('#isEmpty()', () => {

    it('should test whether the main area is empty', () => {
      expect(shell.isEmpty('top')).to.be(true);
      let widget = new Widget();
      widget.id = 'foo';
      shell.addToMainArea(widget);
      expect(shell.isEmpty('main')).to.be(false);
    });

    it('should test whether the top area is empty', () => {
      expect(shell.isEmpty('top')).to.be(true);
      let widget = new Widget();
      widget.id = 'foo';
      shell.addToTopArea(widget);
      expect(shell.isEmpty('top')).to.be(false);
    });

    it('should test whether the left area is empty', () => {
      expect(shell.isEmpty('left')).to.be(true);
      let widget = new Widget();
      widget.id = 'foo';
      shell.addToLeftArea(widget);
      expect(shell.isEmpty('left')).to.be(false);
    });

    it('should test whether the right area is empty', () => {
      expect(shell.isEmpty('right')).to.be(true);
      let widget = new Widget();
      widget.id = 'foo';
      shell.addToRightArea(widget);
      expect(shell.isEmpty('right')).to.be(false);
    });

  });

  describe('#addToTopArea()', () => {

    it('should add a widget to the top area', () => {
      let widget = new Widget();
      widget.id = 'foo';
      shell.addToTopArea(widget);
      expect(shell.isEmpty('top')).to.be(false);
    });

    it('should be a no-op if the widget has no id', () => {
      let widget = new Widget();
      shell.addToTopArea(widget);
      expect(shell.isEmpty('top')).to.be(true);
    });

    it('should accept options', () => {
      let widget = new Widget();
      widget.id = 'foo';
      shell.addToTopArea(widget, { rank: 10 });
      expect(shell.isEmpty('top')).to.be(false);
    });

  });

  describe('#addToLeftArea()', () => {

    it('should add a widget to the left area', () => {
      let widget = new Widget();
      widget.id = 'foo';
      shell.addToLeftArea(widget);
      expect(shell.isEmpty('left')).to.be(false);
    });

    it('should be a no-op if the widget has no id', () => {
      let widget = new Widget();
      shell.addToLeftArea(widget);
      expect(shell.isEmpty('left')).to.be(true);
    });

    it('should accept options', () => {
      let widget = new Widget();
      widget.id = 'foo';
      shell.addToLeftArea(widget, { rank: 10 });
      expect(shell.isEmpty('left')).to.be(false);
    });

  });

  describe('#addToRightArea()', () => {

    it('should add a widget to the right area', () => {
      let widget = new Widget();
      widget.id = 'foo';
      shell.addToRightArea(widget);
      expect(shell.isEmpty('right')).to.be(false);
    });

    it('should be a no-op if the widget has no id', () => {
      let widget = new Widget();
      shell.addToRightArea(widget);
      expect(shell.isEmpty('right')).to.be(true);
    });

    it('should accept options', () => {
      let widget = new Widget();
      widget.id = 'foo';
      shell.addToRightArea(widget, { rank: 10 });
      expect(shell.isEmpty('right')).to.be(false);
    });

  });

  describe('#addToMainArea()', () => {

    it('should add a widget to the main area', () => {
      let widget = new Widget();
      widget.id = 'foo';
      shell.addToMainArea(widget);
      expect(shell.isEmpty('main')).to.be(false);
    });

    it('should be a no-op if the widget has no id', () => {
      let widget = new Widget();
      shell.addToMainArea(widget);
      expect(shell.isEmpty('main')).to.be(true);
    });

  });

  describe('#activateById()', () => {

    it('should activate a widget in the left area', () => {
      let widget = new Widget();
      widget.id = 'foo';
      shell.addToLeftArea(widget);
      expect(widget.isVisible).to.be(false);
      shell.activateById('foo');
      expect(widget.isVisible).to.be(true);
    });

    it('should be a no-op if the widget is not in the left area', () => {
      let widget = new Widget();
      widget.id = 'foo';
      expect(widget.isVisible).to.be(false);
      shell.activateById('foo');
      expect(widget.isVisible).to.be(false);
    });

    it('should activate a widget in the right area', () => {
      let widget = new Widget();
      widget.id = 'foo';
      shell.addToRightArea(widget);
      expect(widget.isVisible).to.be(false);
      shell.activateById('foo');
      expect(widget.isVisible).to.be(true);
    });

    it('should be a no-op if the widget is not in the right area', () => {
      let widget = new Widget();
      widget.id = 'foo';
      expect(widget.isVisible).to.be(false);
      shell.activateById('foo');
      expect(widget.isVisible).to.be(false);
    });

    it('should activate a widget in the main area', (done) => {
      let widget = new ContentWidget();
      widget.id = 'foo';
      shell.addToMainArea(widget);
      shell.activateById('foo');
      requestAnimationFrame(() => {
        expect(widget.activated).to.be(true);
        done();
      });
    });

    it('should be a no-op if the widget is not in the main area', (done) => {
      let widget = new ContentWidget();
      widget.id = 'foo';
      shell.activateById('foo');
      requestAnimationFrame(() => {
        expect(widget.activated).to.be(false);
        done();
      });
    });

  });

  describe('#collapseLeft()', () => {

    it('should collapse all widgets in the left area', () => {
      let widget = new Widget();
      widget.id = 'foo';
      shell.addToLeftArea(widget);
      shell.activateById('foo');
      expect(widget.isVisible).to.be(true);
      shell.collapseLeft();
      expect(widget.isVisible).to.be(false);
    });

  });

  describe('#collapseRight()', () => {

    it('should collapse all widgets in the right area', () => {
      let widget = new Widget();
      widget.id = 'foo';
      shell.addToRightArea(widget);
      shell.activateById('foo');
      expect(widget.isVisible).to.be(true);
      shell.collapseRight();
      expect(widget.isVisible).to.be(false);
    });

  });

  describe('#closeAll()', () => {

    it('should close all of the widgets in the main area', () => {
      let foo = new Widget();
      foo.id = 'foo';
      shell.addToMainArea(foo);
      let bar = new Widget();
      bar.id = 'bar';
      shell.addToMainArea(bar);
      shell.closeAll();
      expect(foo.parent).to.be(null);
      expect(bar.parent).to.be(null);
    });

  });
});
