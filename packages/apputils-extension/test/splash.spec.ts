// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import type { ISplashScreen } from '@jupyterlab/apputils';
import { nullTranslator } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import plugins from '../src/index';

describe('@jupyterlab/apputils-extension', () => {
  describe('ISplashScreen', () => {
    let commands: CommandRegistry;
    let app: JupyterFrontEnd;
    let splashScreen: ISplashScreen;

    const splashPlugin = plugins.find(
      p => p.id === '@jupyterlab/apputils-extension:splash'
    ) as JupyterFrontEndPlugin<ISplashScreen>;

    beforeEach(async () => {
      jest.useFakeTimers();
      commands = new CommandRegistry();
      app = {
        commands,
        restored: Promise.resolve()
      } as unknown as JupyterFrontEnd;
      splashScreen = await splashPlugin.activate(app, nullTranslator);
    });

    afterEach(() => {
      jest.useRealTimers();
      const existing = document.getElementById('jupyterlab-splash');
      if (existing?.parentElement) {
        existing.parentElement.removeChild(existing);
      }
    });

    describe('#show()', () => {
      it('should not remove splash early or throw when shown again during fade-out', async () => {
        const s1 = splashScreen.show();
        const splash = document.getElementById('jupyterlab-splash');
        expect(splash).not.toBeNull();
        expect(document.body.contains(splash)).toBe(true);

        s1.dispose();
        await Promise.resolve();
        expect(splash!.classList.contains('splash-fade')).toBe(true);

        // Advance timers partially into the 200 ms fade-out timeout.
        jest.advanceTimersByTime(100);

        // Show the splash again before the first fade-out timeout completes.
        const s2 = splashScreen.show();
        expect(splash!.classList.contains('splash-fade')).toBe(false);

        // Advance timers past the original 200 ms timeout.
        jest.advanceTimersByTime(150);

        // The splash screen should still be attached because s2 is active.
        expect(document.body.contains(splash)).toBe(true);

        // Dispose s2 and let its fade-out finish.
        s2.dispose();
        await Promise.resolve();
        expect(splash!.classList.contains('splash-fade')).toBe(true);

        expect(() => {
          jest.advanceTimersByTime(200);
        }).not.toThrow();

        expect(document.body.contains(splash)).toBe(false);
      });
    });
  });
});
