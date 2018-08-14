// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { framePromise } from '@jupyterlab/testutils';

import { Message } from '@phosphor/messaging';

import { Widget } from '@phosphor/widgets';

import { simulate } from 'simulate-event';

import { ApplicationShell } from '@jupyterlab/application';

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
      expect(shell).to.be.an.instanceof(ApplicationShell);
    });
  });

  describe('#leftCollapsed', () => {
    it('should return whether the left area is collapsed', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.addToLeftArea(widget);
      expect(shell.leftCollapsed).to.equal(true);
      shell.activateById('foo');
      expect(shell.leftCollapsed).to.equal(false);
    });
  });

  describe('#rightCollapsed', () => {
    it('should return whether the right area is collapsed', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.addToRightArea(widget);
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
      shell.addToMainArea(widget);
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
      shell.addToMainArea(widget);
      expect(shell.isEmpty('main')).to.equal(false);
    });

    it('should test whether the top area is empty', () => {
      expect(shell.isEmpty('top')).to.equal(true);
      const widget = new Widget();
      widget.id = 'foo';
      shell.addToTopArea(widget);
      expect(shell.isEmpty('top')).to.equal(false);
    });

    it('should test whether the left area is empty', () => {
      expect(shell.isEmpty('left')).to.equal(true);
      const widget = new Widget();
      widget.id = 'foo';
      shell.addToLeftArea(widget);
      expect(shell.isEmpty('left')).to.equal(false);
    });

    it('should test whether the right area is empty', () => {
      expect(shell.isEmpty('right')).to.equal(true);
      const widget = new Widget();
      widget.id = 'foo';
      shell.addToRightArea(widget);
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

  describe('#addToTopArea()', () => {
    it('should add a widget to the top area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.addToTopArea(widget);
      expect(shell.isEmpty('top')).to.equal(false);
    });

    it('should be a no-op if the widget has no id', () => {
      const widget = new Widget();
      shell.addToTopArea(widget);
      expect(shell.isEmpty('top')).to.equal(true);
    });

    it('should accept options', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.addToTopArea(widget, { rank: 10 });
      expect(shell.isEmpty('top')).to.equal(false);
    });
  });

  describe('#addToLeftArea()', () => {
    it('should add a widget to the left area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.addToLeftArea(widget);
      expect(shell.isEmpty('left')).to.equal(false);
    });

    it('should be a no-op if the widget has no id', () => {
      const widget = new Widget();
      shell.addToLeftArea(widget);
      expect(shell.isEmpty('left')).to.equal(true);
    });

    it('should accept options', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.addToLeftArea(widget, { rank: 10 });
      expect(shell.isEmpty('left')).to.equal(false);
    });
  });

  describe('#addToRightArea()', () => {
    it('should add a widget to the right area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.addToRightArea(widget);
      expect(shell.isEmpty('right')).to.equal(false);
    });

    it('should be a no-op if the widget has no id', () => {
      const widget = new Widget();
      shell.addToRightArea(widget);
      expect(shell.isEmpty('right')).to.equal(true);
    });

    it('should accept options', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.addToRightArea(widget, { rank: 10 });
      expect(shell.isEmpty('right')).to.equal(false);
    });
  });

  describe('#addToMainArea()', () => {
    it('should add a widget to the main area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.addToMainArea(widget);
      expect(shell.isEmpty('main')).to.equal(false);
    });

    it('should be a no-op if the widget has no id', () => {
      const widget = new Widget();
      shell.addToMainArea(widget);
      expect(shell.isEmpty('main')).to.equal(true);
    });
  });

  describe('#activateById()', () => {
    it('should activate a widget in the left area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.addToLeftArea(widget);
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
      shell.addToRightArea(widget);
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
      shell.addToMainArea(widget);
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
      shell.addToLeftArea(widget);
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
      shell.addToRightArea(widget);
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
      shell.addToLeftArea(widget, { rank: 10 });
      shell.addToLeftArea(widget2, { rank: 1 });
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
      shell.addToLeftArea(widget, { rank: 10 });
      shell.addToLeftArea(widget2, { rank: 1 });
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
      shell.addToRightArea(widget, { rank: 10 });
      shell.addToRightArea(widget2, { rank: 1 });
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
      shell.addToRightArea(widget, { rank: 10 });
      shell.addToRightArea(widget2, { rank: 1 });
      expect(widget2.isVisible).to.equal(false);
      shell.expandRight();
      expect(widget2.isVisible).to.equal(true);
    });
  });

  describe('#closeAll()', () => {
    it('should close all of the widgets in the main area', () => {
      const foo = new Widget();
      foo.id = 'foo';
      shell.addToMainArea(foo);
      const bar = new Widget();
      bar.id = 'bar';
      shell.addToMainArea(bar);
      shell.closeAll();
      expect(foo.parent).to.equal(null);
      expect(bar.parent).to.equal(null);
    });
  });

  describe('#saveLayout', () => {
    it('should save the layout of the shell', () => {
      const foo = new Widget();
      foo.id = 'foo';
      shell.addToMainArea(foo);
      const state = shell.saveLayout();
      shell.activateById('foo');
      expect(state.mainArea.mode).to.equal('multiple-document');
      expect(state.mainArea.currentWidget).to.equal(null);
    });
  });

  describe('#restoreLayout', () => {
    it('should restore the layout of the shell', () => {
      const state = shell.saveLayout();
      shell.mode = 'single-document';
      shell.restoreLayout(state);
      expect(state.mainArea.mode).to.equal('multiple-document');
    });
  });
});
