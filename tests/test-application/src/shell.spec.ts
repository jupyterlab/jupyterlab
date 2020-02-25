// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { framePromise } from '@jupyterlab/testutils';

import { toArray } from '@lumino/algorithm';

import { Message } from '@lumino/messaging';

import { Widget } from '@lumino/widgets';

import { simulate } from 'simulate-event';

import { LabShell } from '@jupyterlab/application';

class ContentWidget extends Widget {
  activated = false;

  onActivateRequest(msg: Message): void {
    this.activated = true;
  }
}

describe('LabShell', () => {
  let shell: LabShell;

  beforeAll(() => {
    console.log(
      'Expecting 5 console errors logged in this suite: "Widgets added to app shell must have unique id property."'
    );
  });

  beforeEach(() => {
    shell = new LabShell();
    Widget.attach(shell, document.body);
  });

  afterEach(() => {
    shell.dispose();
  });

  describe('#constructor()', () => {
    it('should create a LabShell instance', () => {
      expect(shell).to.be.an.instanceof(LabShell);
    });
  });

  describe('#leftCollapsed', () => {
    it('should return whether the left area is collapsed', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'left');
      expect(shell.leftCollapsed).to.equal(true);
      shell.activateById('foo');
      expect(shell.leftCollapsed).to.equal(false);
    });
  });

  describe('#rightCollapsed', () => {
    it('should return whether the right area is collapsed', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'right');
      expect(shell.rightCollapsed).to.equal(true);
      shell.activateById('foo');
      expect(shell.rightCollapsed).to.equal(false);
    });
  });

  describe('#currentWidget', () => {
    it('should be the current widget in the shell main area', () => {
      expect(shell.currentWidget).to.equal(null);
      const widget = new Widget();
      widget.node.tabIndex = -1;
      widget.id = 'foo';
      shell.add(widget, 'main');
      expect(shell.currentWidget).to.equal(null);
      simulate(widget.node, 'focus');
      expect(shell.currentWidget).to.equal(widget);
      widget.parent = null;
      expect(shell.currentWidget).to.equal(null);
    });
  });

  describe('#isEmpty()', () => {
    it('should test whether the main area is empty', () => {
      expect(shell.isEmpty('top')).to.equal(true);
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'main');
      expect(shell.isEmpty('main')).to.equal(false);
    });

    it('should test whether the top area is empty', () => {
      expect(shell.isEmpty('top')).to.equal(true);
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'top');
      expect(shell.isEmpty('top')).to.equal(false);
    });

    it('should test whether the left area is empty', () => {
      expect(shell.isEmpty('left')).to.equal(true);
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'left');
      expect(shell.isEmpty('left')).to.equal(false);
    });

    it('should test whether the right area is empty', () => {
      expect(shell.isEmpty('right')).to.equal(true);
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'right');
      expect(shell.isEmpty('right')).to.equal(false);
    });
  });

  describe('#restored', () => {
    it('should resolve when the app is restored for the first time', () => {
      const state = shell.saveLayout();
      shell.restoreLayout(state);
      return shell.restored;
    });
  });

  describe('#add(widget, "header")', () => {
    it('should add a widget to the header', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'header');
      expect(shell.isEmpty('header')).to.equal(false);
    });

    it('should be a no-op if the widget has no id', () => {
      const widget = new Widget();
      shell.add(widget, 'header');
      expect(shell.isEmpty('header')).to.equal(true);
    });

    it('should accept options', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'header', { rank: 10 });
      expect(shell.isEmpty('header')).to.equal(false);
    });
  });

  describe('#add(widget, "top")', () => {
    it('should add a widget to the top area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'top');
      expect(shell.isEmpty('top')).to.equal(false);
    });

    it('should be a no-op if the widget has no id', () => {
      const widget = new Widget();
      shell.add(widget, 'top');
      expect(shell.isEmpty('top')).to.equal(true);
    });

    it('should accept options', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'top', { rank: 10 });
      expect(shell.isEmpty('top')).to.equal(false);
    });

    it('should add widgets according to their ranks', () => {
      const foo = new Widget();
      const bar = new Widget();
      foo.id = 'foo';
      bar.id = 'bar';
      shell.add(foo, 'top', { rank: 20 });
      shell.add(bar, 'top', { rank: 10 });
      expect(toArray(shell.widgets('top'))).to.deep.equal([bar, foo]);
    });
  });

  describe('#add(widget, "left")', () => {
    it('should add a widget to the left area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'left');
      expect(shell.isEmpty('left')).to.equal(false);
    });

    it('should be a no-op if the widget has no id', () => {
      const widget = new Widget();
      shell.add(widget, 'left');
      expect(shell.isEmpty('left')).to.equal(true);
    });

    it('should accept options', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'left', { rank: 10 });
      expect(shell.isEmpty('left')).to.equal(false);
    });
  });

  describe('#add(widget, "right")', () => {
    it('should add a widget to the right area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'right');
      expect(shell.isEmpty('right')).to.equal(false);
    });

    it('should be a no-op if the widget has no id', () => {
      const widget = new Widget();
      shell.add(widget, 'right');
      expect(shell.isEmpty('right')).to.equal(true);
    });

    it('should accept options', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'right', { rank: 10 });
      expect(shell.isEmpty('right')).to.equal(false);
    });
  });

  describe('#add(widget, "main")', () => {
    it('should add a widget to the main area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'main');
      expect(shell.isEmpty('main')).to.equal(false);
    });

    it('should be a no-op if the widget has no id', () => {
      const widget = new Widget();
      shell.add(widget, 'main');
      expect(shell.isEmpty('main')).to.equal(true);
    });
  });

  describe('#activateById()', () => {
    it('should activate a widget in the left area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'left');
      expect(widget.isVisible).to.equal(false);
      shell.activateById('foo');
      expect(widget.isVisible).to.equal(true);
    });

    it('should be a no-op if the widget is not in the left area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      expect(widget.isVisible).to.equal(false);
      shell.activateById('foo');
      expect(widget.isVisible).to.equal(false);
    });

    it('should activate a widget in the right area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'right');
      expect(widget.isVisible).to.equal(false);
      shell.activateById('foo');
      expect(widget.isVisible).to.equal(true);
    });

    it('should be a no-op if the widget is not in the right area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      expect(widget.isVisible).to.equal(false);
      shell.activateById('foo');
      expect(widget.isVisible).to.equal(false);
    });

    it('should activate a widget in the main area', async () => {
      const widget = new ContentWidget();
      widget.id = 'foo';
      shell.add(widget, 'main');
      shell.activateById('foo');
      await framePromise();
      expect(widget.activated).to.equal(true);
    });

    it('should be a no-op if the widget is not in the main area', async () => {
      const widget = new ContentWidget();
      widget.id = 'foo';
      shell.activateById('foo');
      await framePromise();
      expect(widget.activated).to.equal(false);
    });
  });

  describe('#collapseLeft()', () => {
    it('should collapse all widgets in the left area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'left');
      shell.activateById('foo');
      expect(widget.isVisible).to.equal(true);
      shell.collapseLeft();
      expect(widget.isVisible).to.equal(false);
    });
  });

  describe('#collapseRight()', () => {
    it('should collapse all widgets in the right area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'right');
      shell.activateById('foo');
      expect(widget.isVisible).to.equal(true);
      shell.collapseRight();
      expect(widget.isVisible).to.equal(false);
    });
  });

  describe('#expandLeft()', () => {
    it('should expand the most recently used widget', () => {
      const widget = new Widget();
      widget.id = 'foo';
      const widget2 = new Widget();
      widget2.id = 'bar';
      shell.add(widget, 'left', { rank: 10 });
      shell.add(widget2, 'left', { rank: 1 });
      shell.activateById('foo');
      shell.collapseLeft();
      expect(widget.isVisible).to.equal(false);
      shell.expandLeft();
      expect(widget.isVisible).to.equal(true);
    });

    it('should expand the first widget if none have been activated', () => {
      const widget = new Widget();
      widget.id = 'foo';
      const widget2 = new Widget();
      widget2.id = 'bar';
      shell.add(widget, 'left', { rank: 10 });
      shell.add(widget2, 'left', { rank: 1 });
      expect(widget2.isVisible).to.equal(false);
      shell.expandLeft();
      expect(widget2.isVisible).to.equal(true);
    });
  });

  describe('#expandRight()', () => {
    it('should expand the most recently used widget', () => {
      const widget = new Widget();
      widget.id = 'foo';
      const widget2 = new Widget();
      widget2.id = 'bar';
      shell.add(widget, 'right', { rank: 10 });
      shell.add(widget2, 'right', { rank: 1 });
      shell.activateById('foo');
      shell.collapseRight();
      expect(widget.isVisible).to.equal(false);
      shell.expandRight();
      expect(widget.isVisible).to.equal(true);
    });

    it('should expand the first widget if none have been activated', () => {
      const widget = new Widget();
      widget.id = 'foo';
      const widget2 = new Widget();
      widget2.id = 'bar';
      shell.add(widget, 'right', { rank: 10 });
      shell.add(widget2, 'right', { rank: 1 });
      expect(widget2.isVisible).to.equal(false);
      shell.expandRight();
      expect(widget2.isVisible).to.equal(true);
    });
  });

  describe('#closeAll()', () => {
    it('should close all of the widgets in the main area', () => {
      const foo = new Widget();
      foo.id = 'foo';
      shell.add(foo, 'main');
      const bar = new Widget();
      bar.id = 'bar';
      shell.add(bar, 'main');
      shell.closeAll();
      expect(foo.parent).to.equal(null);
      expect(bar.parent).to.equal(null);
    });
  });

  describe('#saveLayout', () => {
    it('should save the layout of the shell', () => {
      const foo = new Widget();
      foo.id = 'foo';
      shell.add(foo, 'main');
      const state = shell.saveLayout();
      shell.activateById('foo');
      expect(state.mainArea?.mode).to.equal('multiple-document');
      expect(state.mainArea?.currentWidget).to.equal(null);
    });
  });

  describe('#restoreLayout', () => {
    it('should restore the layout of the shell', () => {
      const state = shell.saveLayout();
      shell.mode = 'single-document';
      shell.restoreLayout(state);
      expect(state.mainArea?.mode).to.equal('multiple-document');
    });
  });
});
