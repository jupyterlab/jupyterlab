/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  createSemanticCommand,
  JupyterLab,
  LabShell
} from '@jupyterlab/application';
import { SemanticCommand } from '@jupyterlab/apputils';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { Widget } from '@lumino/widgets';

describe('@jupyterlab/application', () => {
  describe('createSemanticCommand', () => {
    let app: JupyterLab;
    let commands: CommandRegistry;
    let currentWidget;
    let translator: ITranslator;
    let semanticCmd: SemanticCommand;

    beforeEach(() => {
      commands = new CommandRegistry();
      currentWidget = new Widget();
      translator = nullTranslator;
      semanticCmd = new SemanticCommand();
      app = {
        commands,
        shell: {
          currentWidget
        } as LabShell
      } as any as JupyterLab;
    });

    it.each([
      [[true, false], false, true],
      [[true, false], true, true],
      [[true, false], undefined, true],
      [[false, false], false, false],
      [[false, false], undefined, false],
      [[false, false], true, true],
      [[true, true], false, true],
      [[true, true], true, true],
      [[true, true], undefined, true],
      [[], false, false],
      [[], undefined, false],
      [[], true, true]
    ])('%j & default %s has isEnabled %s', (values, defaultValue, expected) => {
      for (let i = 0; i < values.length; i++) {
        const id = `command-${i}`;
        commands.addCommand(id, {
          execute: () => null,
          isEnabled: () => values[i]
        });

        semanticCmd.add({ id });
      }

      const contextualCommand = createSemanticCommand(
        app,
        semanticCmd,
        {
          isEnabled: defaultValue
        },
        translator.load('jupyterlab')
      );

      expect(contextualCommand.isEnabled?.call({})).toEqual(expected);
    });

    it.each([
      [[true, false], false, true],
      [[true, false], true, true],
      [[true, false], undefined, true],
      [[false, false], false, false],
      [[false, false], undefined, false],
      [[false, false], true, true],
      [[true, true], false, true],
      [[true, true], true, true],
      [[true, true], undefined, true],
      [[], false, false],
      [[], undefined, false],
      [[], true, true]
    ])('%j & default %s has isToggled %s', (values, defaultValue, expected) => {
      for (let i = 0; i < values.length; i++) {
        const id = `command-${i}`;
        commands.addCommand(id, {
          execute: () => null,
          isToggled: () => values[i]
        });

        semanticCmd.add({ id });
      }

      const contextualCommand = createSemanticCommand(
        app,
        semanticCmd,
        {
          isToggled: defaultValue
        },
        translator.load('jupyterlab')
      );

      expect(contextualCommand.isToggled?.call({})).toEqual(expected);
    });

    it.each([
      [[true, false], false, true],
      [[true, false], true, true],
      [[true, false], undefined, true],
      [[false, false], false, false],
      [[false, false], undefined, true],
      [[false, false], true, true],
      [[true, true], false, true],
      [[true, true], true, true],
      [[true, true], undefined, true],
      [[], false, false],
      [[], undefined, true],
      [[], true, true]
    ])('%j & default %s has isVisible %s', (values, defaultValue, expected) => {
      for (let i = 0; i < values.length; i++) {
        const id = `command-${i}`;
        commands.addCommand(id, {
          execute: () => null,
          isVisible: () => values[i]
        });

        semanticCmd.add({ id });
      }

      const contextualCommand = createSemanticCommand(
        app,
        semanticCmd,
        {
          isVisible: defaultValue
        },
        translator.load('jupyterlab')
      );

      expect(contextualCommand.isVisible?.call({})).toEqual(expected);
    });
  });
});
