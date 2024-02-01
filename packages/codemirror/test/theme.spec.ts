/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  EditorThemeRegistry,
  IEditorThemeRegistry
} from '@jupyterlab/codemirror';
import { oneDark } from './onedarktheme';

describe('themes', () => {
  let themes: IEditorThemeRegistry;

  beforeEach(() => {
    themes = new EditorThemeRegistry();
  });

  describe('#defaultTheme', () => {
    it('should return the `jupyter` theme', () => {
      expect(themes.defaultTheme()).toBe(themes.getTheme('jupyter'));
    });
  });

  describe('#addTheme', () => {
    it('should add a new theme', () => {
      themes.addTheme({ name: 'one dark', theme: oneDark });

      expect(themes.getTheme('one dark')).toBe(oneDark);
    });
  });

  describe('#getTheme', () => {
    it('should return the given theme', () => {
      themes.addTheme({ name: 'one dark', theme: oneDark });

      expect(themes.getTheme('one dark')).toBe(oneDark);
    });

    it('should return the default theme if the name does not exist', () => {
      expect(themes.getTheme('bar')).toBe(themes.defaultTheme());
    });
  });
});
