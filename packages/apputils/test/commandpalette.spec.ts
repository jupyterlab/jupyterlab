// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ModalCommandPalette } from '@jupyterlab/apputils';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { CommandPaletteSvg, paletteIcon } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { JSONObject } from '@lumino/coreutils';
import { MessageLoop } from '@lumino/messaging';
import { CommandPalette, Widget } from '@lumino/widgets';
import { simulate } from 'simulate-event';

describe('@jupyterlab/apputils', () => {
  describe('ModalCommandPalette', () => {
    let commands: CommandRegistry;
    let translator: ITranslator;
    let palette: CommandPalette;
    let modalPalette: ModalCommandPalette;

    beforeEach(() => {
      commands = new CommandRegistry();
      translator = nullTranslator;
      palette = new CommandPalette({
        commands: commands,
        renderer: CommandPaletteSvg.defaultRenderer
      });
      palette.id = 'command-palette';
      palette.title.icon = paletteIcon;
      const trans = translator.load('jupyterlab');
      palette.title.label = trans.__('Commands');
      modalPalette = new ModalCommandPalette({ commandPalette: palette });
      modalPalette.attach();
    });

    describe('#constructor()', () => {
      it('should create a new command palette', () => {
        expect(palette).toBeInstanceOf(CommandPalette);
      });
      it('should create a new modal command palette', () => {
        expect(modalPalette).toBeInstanceOf(ModalCommandPalette);
      });
      it('should attach to the document body', () => {
        expect(document.body.contains(modalPalette.node)).toBe(true);
      });
      it('should start hidden', () => {
        expect(modalPalette.isHidden).toBe(true);
      });
    });

    describe('#activate()', () => {
      it('should become visible when activated', () => {
        MessageLoop.sendMessage(modalPalette, Widget.Msg.ActivateRequest);
        expect(modalPalette.isVisible).toBe(true);
      });
    });

    describe('#hideAndReset()', () => {
      it('should become hidden and clear the input when calling hideAndReset', () => {
        MessageLoop.sendMessage(modalPalette, Widget.Msg.ActivateRequest);
        palette.inputNode.value = 'Search string…';
        modalPalette.hideAndReset();
        expect(modalPalette.isVisible).toBe(false);
        expect(palette.inputNode.value).toEqual('');
      });
    });

    describe('#blur()', () => {
      it('should hide and reset when focus is shifted', () => {
        MessageLoop.sendMessage(modalPalette, Widget.Msg.ActivateRequest);
        palette.inputNode.value = 'Search string…';
        simulate(modalPalette.node, 'blur', {
          relatedTarget: document.body
        });
        expect(modalPalette.isVisible).toBe(false);
        expect(palette.inputNode.value).toEqual('');
      });
    });

    describe('#escape()', () => {
      it('should hide and reset when ESC is pressed', () => {
        MessageLoop.sendMessage(modalPalette, Widget.Msg.ActivateRequest);
        palette.inputNode.value = 'Search string…';
        simulate(modalPalette.node, 'keydown', { keyCode: 27 });
        expect(modalPalette.isVisible).toBe(false);
        expect(palette.inputNode.value).toEqual('');
      });
    });

    describe('#execute()', () => {
      it('should hide and reset when a command is executed', () => {
        commands.addCommand('mock-command', {
          execute: (args: JSONObject) => {
            return args;
          }
        });
        MessageLoop.sendMessage(modalPalette, Widget.Msg.ActivateRequest);
        void commands.execute('mock-command');
        expect(modalPalette.isVisible).toBe(false);
        expect(palette.inputNode.value).toEqual('');
      });
    });
  });
});
