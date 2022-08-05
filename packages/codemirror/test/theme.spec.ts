import { Theme } from '@jupyterlab/codemirror';
import { oneDark } from './onedarktheme';

describe('Theme', () => {
  describe('#defaultTheme', () => {
    it('should return the `jupyter` theme', () => {
      expect(Theme.defaultTheme()).toBe(Theme.getTheme('jupyter'));
    });
  });

  describe('#registerTheme', () => {
    it('should add a new theme', () => {
      Theme.registerTheme('one dark', oneDark);

      expect(Theme.getTheme('one dark')).toBe(oneDark);
    });
  });

  describe('#getTheme', () => {
    it('should return the given theme', () => {
      Theme.registerTheme('one dark', oneDark);

      expect(Theme.getTheme('one dark')).toBe(oneDark);
    });

    it('should return the default theme if the name does not exist', () => {
      expect(Theme.getTheme('bar')).toBe(Theme.defaultTheme());
    });
  });
});
