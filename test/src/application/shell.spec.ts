// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ApplicationShell
} from '../../../lib/application';


describe('ApplicationShell', () => {

  let shell: ApplicationShell;

  beforeEach(() => {
    shell = new ApplicationShell();
  });

  describe('#constructor()', () => {

    it('should create an ApplicationShell instance', () => {
      expect(shell).to.be.an(ApplicationShell);
    });

  });

  describe('#currentWidget', () => {

    it('should be the current widget in the shell main area', () => {

    });

  });

  describe('#mainAreaIsEmpty', () => {

    it('should test whether the main area is empty', () => {

    });

  });

  describe('#topAreaIsEmpty', () => {

    it('should test whether the top area is empty', () => {

    });

  });

  describe('#leftAreaIsEmpty', () => {

    it('should test whether the left area is empty', () => {

    });

  });

  describe('#rightAreaIsEmpty', () => {

    it('should test whether the right area is empty', () => {

    });

  });

  describe('#addToTopArea()', () => {

    it('should add a widget to the top area', () => {

    });

    it('should be a no-op if the widget has no id', () => {

    });

    it('should accept options', () => {

    });

  });

  describe('#addToLeftArea()', () => {

    it('should add a widget to the left area', () => {

    });

    it('should be a no-op if the widget has no id', () => {

    });

    it('should accept options', () => {

    });

  });

  describe('#addToRightArea()', () => {

    it('should add a widget to the right area', () => {

    });

    it('should be a no-op if the widget has no id', () => {

    });

    it('should accept options', () => {

    });

  });

  describe('#addToMainArea()', () => {

    it('should add a widget to the main area', () => {

    });

    it('should be a no-op if the widget has no id', () => {

    });

    it('should accept options', () => {

    });

  });

  describe('#activateLeft()', () => {

    it('should activate a widget in the left area', () => {

    });

    it('should be a no-op if the widget is not in the left area', () => {

    });

  });

  describe('#activateRight()', () => {

    it('should activate a widget in the right area', () => {

    });

    it('should be a no-op if the widget is not in the right area', () => {

    });

  });

  describe('#activateTop()', () => {

    it('should activate a widget in the top area', () => {

    });

    it('should be a no-op if the widget is not in the top area', () => {

    });

  });

  describe('#activateMain()', () => {

    it('should activate a widget in the main area', () => {

    });

    it('should be a no-op if the widget is not in the main area', () => {

    });

  });

  describe('#collapseLeft()', () => {

    it('should collapse all widgets in the left area', () => {

    });

  });

  describe('#collapseRight()', () => {

    it('should collapse all widgets in the right area', () => {

    });

  });

  describe('#closeAll()', () => {

    it('should close all of the widgets in the main area', () => {

    });

  });
});
