import { Theme } from '@jupyterlab/codemirror';
import { nord } from './nordtheme';

describe('Theme', () => {
  describe('#defaultTheme', () => {
    it('should return the `jupyter` theme', () => {
      expect(Theme.defaultTheme()).toBe(Theme.getTheme('jupyter'));
    });
  });

  describe('#registerTheme', () => {
    it('should add a new theme', () => {
      Theme.registerTheme('nord', nord);

      expect(Theme.getTheme('nord')).toBe(nord);
    });
  });

  describe('#getTheme', () => {
    it('should return the given theme', () => {
      Theme.registerTheme('nord', nord);

      expect(Theme.getTheme('nord')).toBe(nord);
    });

    it('should return the default theme if the name does not exist', () => {
      expect(Theme.getTheme('bar')).toBe(Theme.defaultTheme());
    });
  });
});
