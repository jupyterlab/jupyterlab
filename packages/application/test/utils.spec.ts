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

    // Labels/captions, defaultLabel/defaultCaption, expected
    it.each([
      [[], undefined, ''],
      [[], 'default', 'default'],
      [[''], 'default', ''],
      [['label a'], 'default', 'label a'],
      [['label a', 'label b'], 'default', 'label a and label b'],
      [['label a', 'label b…'], 'default', 'label a and label b…'],
      [['label a…', 'label b'], 'default', 'label a and label b…'],
      [['label a…', 'label b…'], 'default', 'label a and label b…'],
      [
        ['label a', 'label b', 'label c'],
        'default',
        'label a, label b and label c'
      ],
      [
        ['label a…', 'label b…', 'label c'],
        'default',
        'label a, label b and label c…'
      ],
      [
        ['label a…', 'label b', 'label c…'],
        'default',
        'label a, label b and label c…'
      ],
      [
        ['label a…', 'label b…', 'label c…'],
        'default',
        'label a, label b and label c…'
      ],
      [
        ['label a', 'label b…', 'label c'],
        'default',
        'label a, label b and label c…'
      ],
      [
        ['label a', 'label b…', 'label c…'],
        'default',
        'label a, label b and label c…'
      ],
      [
        ['label a', 'label b', 'label c…'],
        'default',
        'label a, label b and label c…'
      ]
    ])(
      'labels/captions %j, and default %s has label/caption %s',
      (values, defaultValue, expected) => {
        let myCommands: SemanticCommand[] = [];

        for (let i = 0; i < values.length; i++) {
          semanticCmd = new SemanticCommand();
          const id = `command-${i}`;
          const label = values[i];
          const caption = label.replace('label', 'caption');
          commands.addCommand(id, {
            execute: () => null,
            label: label,
            caption: caption
          });

          semanticCmd.add({ id });
          myCommands.push(semanticCmd);
        }

        const semanticCommandId = 'my-semantic-command';
        commands.addCommand(
          semanticCommandId,
          createSemanticCommand(
            app,
            myCommands,
            {
              label: defaultValue,
              caption: defaultValue?.replace('label', 'caption')
            },
            translator.load('jupyterlab')
          )
        );

        expect(commands.label(semanticCommandId)).toEqual(expected);
        expect(commands.caption(semanticCommandId)).toEqual(
          expected.replace(/label/g, 'caption')
        );
      }
    );
  });
});
