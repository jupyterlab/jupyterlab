// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

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
    console.debug(
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
      expect(shell).toBeInstanceOf(LabShell);
    });
  });

  describe('#leftCollapsed', () => {
    it('should return whether the left area is collapsed', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'left');
      expect(shell.leftCollapsed).toBe(true);
      shell.activateById('foo');
      expect(shell.leftCollapsed).toBe(false);
    });
  });

  describe('#rightCollapsed', () => {
    it('should return whether the right area is collapsed', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'right');
      expect(shell.rightCollapsed).toBe(true);
      shell.activateById('foo');
      expect(shell.rightCollapsed).toBe(false);
    });
  });

  describe('#currentWidget', () => {
    it('should be the current widget in the shell main area', () => {
      expect(shell.currentWidget).toBe(null);
      const widget = new Widget();
      widget.node.tabIndex = -1;
      widget.id = 'foo';
      shell.add(widget, 'main');
      expect(shell.currentWidget).toBe(null);
      simulate(widget.node, 'focus');
      expect(shell.currentWidget).toBe(widget);
      widget.parent = null;
      expect(shell.currentWidget).toBe(null);
    });
  });

  describe('#isEmpty()', () => {
    it('should test whether the main area is empty', () => {
      expect(shell.isEmpty('top')).toBe(true);
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'main');
      expect(shell.isEmpty('main')).toBe(false);
    });

    it('should test whether the top area is empty', () => {
      expect(shell.isEmpty('top')).toBe(true);
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'top');
      expect(shell.isEmpty('top')).toBe(false);
    });

    it('should test whether the left area is empty', () => {
      expect(shell.isEmpty('left')).toBe(true);
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'left');
      expect(shell.isEmpty('left')).toBe(false);
    });

    it('should test whether the right area is empty', () => {
      expect(shell.isEmpty('right')).toBe(true);
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'right');
      expect(shell.isEmpty('right')).toBe(false);
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
      expect(shell.isEmpty('header')).toBe(false);
    });

    it('should be a no-op if the widget has no id', () => {
      const widget = new Widget();
      shell.add(widget, 'header');
      expect(shell.isEmpty('header')).toBe(true);
    });

    it('should accept options', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'header', { rank: 10 });
      expect(shell.isEmpty('header')).toBe(false);
    });
  });

  describe('#add(widget, "top")', () => {
    it('should add a widget to the top area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'top');
      expect(shell.isEmpty('top')).toBe(false);
    });

    it('should be a no-op if the widget has no id', () => {
      const widget = new Widget();
      shell.add(widget, 'top');
      expect(shell.isEmpty('top')).toBe(true);
    });

    it('should accept options', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'top', { rank: 10 });
      expect(shell.isEmpty('top')).toBe(false);
    });

    it('should add widgets according to their ranks', () => {
      const foo = new Widget();
      const bar = new Widget();
      foo.id = 'foo';
      bar.id = 'bar';
      shell.add(foo, 'top', { rank: 20 });
      shell.add(bar, 'top', { rank: 10 });
      expect(toArray(shell.widgets('top'))).toEqual([bar, foo]);
    });
  });

  describe('#add(widget, "left")', () => {
    it('should add a widget to the left area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'left');
      expect(shell.isEmpty('left')).toBe(false);
    });

    it('should be a no-op if the widget has no id', () => {
      const widget = new Widget();
      shell.add(widget, 'left');
      expect(shell.isEmpty('left')).toBe(true);
    });

    it('should accept options', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'left', { rank: 10 });
      expect(shell.isEmpty('left')).toBe(false);
    });
  });

  describe('#add(widget, "right")', () => {
    it('should add a widget to the right area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'right');
      expect(shell.isEmpty('right')).toBe(false);
    });

    it('should be a no-op if the widget has no id', () => {
      const widget = new Widget();
      shell.add(widget, 'right');
      expect(shell.isEmpty('right')).toBe(true);
    });

    it('should accept options', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'right', { rank: 10 });
      expect(shell.isEmpty('right')).toBe(false);
    });
  });

  describe('#add(widget, "main")', () => {
    it('should add a widget to the main area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'main');
      expect(shell.isEmpty('main')).toBe(false);
    });

    it('should be a no-op if the widget has no id', () => {
      const widget = new Widget();
      shell.add(widget, 'main');
      expect(shell.isEmpty('main')).toBe(true);
    });
  });

  describe('#activateById()', () => {
    it('should activate a widget in the left area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'left');
      expect(widget.isVisible).toBe(false);
      shell.activateById('foo');
      expect(widget.isVisible).toBe(true);
    });

    it('should be a no-op if the widget is not in the left area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      expect(widget.isVisible).toBe(false);
      shell.activateById('foo');
      expect(widget.isVisible).toBe(false);
    });

    it('should activate a widget in the right area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'right');
      expect(widget.isVisible).toBe(false);
      shell.activateById('foo');
      expect(widget.isVisible).toBe(true);
    });

    it('should be a no-op if the widget is not in the right area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      expect(widget.isVisible).toBe(false);
      shell.activateById('foo');
      expect(widget.isVisible).toBe(false);
    });

    it('should activate a widget in the main area', async () => {
      const widget = new ContentWidget();
      widget.id = 'foo';
      shell.add(widget, 'main');
      shell.activateById('foo');
      await framePromise();
      expect(widget.activated).toBe(true);
    });

    it('should be a no-op if the widget is not in the main area', async () => {
      const widget = new ContentWidget();
      widget.id = 'foo';
      shell.activateById('foo');
      await framePromise();
      expect(widget.activated).toBe(false);
    });
  });

  describe('#collapseLeft()', () => {
    it('should collapse all widgets in the left area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'left');
      shell.activateById('foo');
      expect(widget.isVisible).toBe(true);
      shell.collapseLeft();
      expect(widget.isVisible).toBe(false);
    });
  });

  describe('#collapseRight()', () => {
    it('should collapse all widgets in the right area', () => {
      const widget = new Widget();
      widget.id = 'foo';
      shell.add(widget, 'right');
      shell.activateById('foo');
      expect(widget.isVisible).toBe(true);
      shell.collapseRight();
      expect(widget.isVisible).toBe(false);
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
      expect(widget.isVisible).toBe(false);
      shell.expandLeft();
      expect(widget.isVisible).toBe(true);
    });

    it('should expand the first widget if none have been activated', () => {
      const widget = new Widget();
      widget.id = 'foo';
      const widget2 = new Widget();
      widget2.id = 'bar';
      shell.add(widget, 'left', { rank: 10 });
      shell.add(widget2, 'left', { rank: 1 });
      expect(widget2.isVisible).toBe(false);
      shell.expandLeft();
      expect(widget2.isVisible).toBe(true);
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
      expect(widget.isVisible).toBe(false);
      shell.expandRight();
      expect(widget.isVisible).toBe(true);
    });

    it('should expand the first widget if none have been activated', () => {
      const widget = new Widget();
      widget.id = 'foo';
      const widget2 = new Widget();
      widget2.id = 'bar';
      shell.add(widget, 'right', { rank: 10 });
      shell.add(widget2, 'right', { rank: 1 });
      expect(widget2.isVisible).toBe(false);
      shell.expandRight();
      expect(widget2.isVisible).toBe(true);
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
      expect(foo.parent).toBe(null);
      expect(bar.parent).toBe(null);
    });
  });

  describe('#saveLayout', () => {
    it('should save the layout of the shell', () => {
      const foo = new Widget();
      foo.id = 'foo';
      shell.add(foo, 'main');
      const state = shell.saveLayout();
      shell.activateById('foo');
      expect(state.mainArea?.mode).toBe('multiple-document');
      expect(state.mainArea?.currentWidget).toBe(null);
    });
  });

  describe('#restoreLayout', () => {
    it('should restore the layout of the shell', () => {
      const state = shell.saveLayout();
      shell.mode = 'single-document';
      shell.restoreLayout(state);
      expect(state.mainArea?.mode).toBe('multiple-document');
    });
  });
});
