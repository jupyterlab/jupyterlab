/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { addSemanticCommand, JupyterFrontEnd } from '@jupyterlab/application';
import { SemanticCommand } from '@jupyterlab/apputils';
import { CommandRegistry } from '@lumino/commands';
import { Widget } from '@lumino/widgets';

describe('@jupyterlab/application', () => {
  describe('addSemanticCommand', () => {
    const id = 'semantic-command:default';
    let commands: CommandRegistry;
    let shell: JupyterFrontEnd.IShell;
    let semanticCommands: SemanticCommand;

    beforeEach(() => {
      commands = new CommandRegistry();
      shell = new Widget() as JupyterFrontEnd.IShell;
      semanticCommands = new SemanticCommand();
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

        semanticCommands.add({ id });
      }

      addSemanticCommand({
        id,
        commands,
        shell,
        semanticCommands,
        default: {
          isEnabled: defaultValue
        }
      });

      expect(commands.isEnabled(id)).toEqual(expected);
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

        semanticCommands.add({ id });
      }

      addSemanticCommand({
        id,
        commands,
        shell,
        semanticCommands,
        default: {
          isToggled: defaultValue
        }
      });

      expect(commands.isToggled(id)).toEqual(expected);
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

        semanticCommands.add({ id });
      }

      addSemanticCommand({
        id,
        commands,
        shell,
        semanticCommands,
        default: {
          isVisible: defaultValue
        }
      });

      expect(commands.isVisible(id)).toEqual(expected);
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
          const semanticCmd = new SemanticCommand();
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
        addSemanticCommand({
          id: semanticCommandId,
          commands,
          shell,
          semanticCommands: myCommands,
          default: {
            label: defaultValue,
            caption: defaultValue?.replace('label', 'caption')
          }
        });

        expect(commands.label(semanticCommandId)).toEqual(expected);
        expect(commands.caption(semanticCommandId)).toEqual(
          expected.replace(/label/g, 'caption')
        );
      }
    );

    it.each([
      [[true, false], false, false],
      [[true, false], true, true],
      [[true, false], undefined, true],
      [[false, false], false, false],
      [[false, false], undefined, false],
      [[false, false], true, true],
      [[true, true], false, false],
      [[true, true], true, true],
      [[true, true], undefined, true],
      [[], false, false],
      [[], undefined, false],
      [[], true, true]
    ])('%j & overrides %s has isEnabled %s', (values, overrides, expected) => {
      for (let i = 0; i < values.length; i++) {
        const id = `command-${i}`;
        commands.addCommand(id, {
          execute: () => null,
          isEnabled: () => values[i]
        });

        semanticCommands.add({ id });
      }

      addSemanticCommand({
        id,
        commands,
        shell,
        semanticCommands,
        overrides:
          typeof overrides === 'boolean'
            ? {
                isEnabled: () => overrides
              }
            : overrides
      });

      expect(commands.isEnabled(id)).toEqual(expected);
    });

    it.each([
      [[true, false], false, false],
      [[true, false], true, true],
      [[true, false], undefined, true],
      [[false, false], false, false],
      [[false, false], undefined, false],
      [[false, false], true, true],
      [[true, true], false, false],
      [[true, true], true, true],
      [[true, true], undefined, true],
      [[], false, false],
      [[], undefined, false],
      [[], true, true]
    ])('%j & overrides %s has isToggled %s', (values, overrides, expected) => {
      for (let i = 0; i < values.length; i++) {
        const id = `command-${i}`;
        commands.addCommand(id, {
          execute: () => null,
          isToggled: () => values[i]
        });

        semanticCommands.add({ id });
      }

      addSemanticCommand({
        id,
        commands,
        shell,
        semanticCommands,
        overrides:
          typeof overrides === 'boolean'
            ? {
                isToggled: () => overrides
              }
            : overrides
      });

      expect(commands.isToggled(id)).toEqual(expected);
    });

    it.each([
      [[true, false], false, false],
      [[true, false], true, true],
      [[true, false], undefined, true],
      [[false, false], false, false],
      [[false, false], undefined, true],
      [[false, false], true, true],
      [[true, true], false, false],
      [[true, true], true, true],
      [[true, true], undefined, true],
      [[], false, false],
      [[], undefined, true],
      [[], true, true]
    ])('%j & overrides %s has isVisible %s', (values, overrides, expected) => {
      for (let i = 0; i < values.length; i++) {
        const id = `command-${i}`;
        commands.addCommand(id, {
          execute: () => null,
          isVisible: () => values[i]
        });

        semanticCommands.add({ id });
      }

      addSemanticCommand({
        id,
        commands,
        shell,
        semanticCommands,
        overrides:
          typeof overrides === 'boolean'
            ? {
                isVisible: () => overrides
              }
            : overrides
      });

      expect(commands.isVisible(id)).toEqual(expected);
    });

    // Labels/captions, defaultLabel/defaultCaption, expected
    it.each([
      [[], undefined, ''],
      [[], 'default', 'default'],
      [[''], 'default', 'default'],
      [['label a'], 'default', 'default'],
      [['label a', 'label b'], 'default', 'default'],
      [['label a', 'label b…'], 'default', 'default'],
      [['label a…', 'label b'], 'default', 'default'],
      [['label a…', 'label b…'], 'default', 'default'],
      [['label a', 'label b', 'label c'], 'default', 'default'],
      [['label a…', 'label b…', 'label c'], 'default', 'default'],
      [['label a…', 'label b', 'label c…'], 'default', 'default'],
      [['label a…', 'label b…', 'label c…'], 'default', 'default'],
      [['label a', 'label b…', 'label c'], 'default', 'default'],
      [['label a', 'label b…', 'label c…'], 'default', 'default'],
      [['label a', 'label b', 'label c…'], 'default', 'default']
    ])(
      'labels/captions %j, and overrides %s has label/caption %s',
      (values, overrides, expected) => {
        let myCommands: SemanticCommand[] = [];

        for (let i = 0; i < values.length; i++) {
          const semanticCmd = new SemanticCommand();
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
        addSemanticCommand({
          id: semanticCommandId,
          commands,
          shell,
          semanticCommands: myCommands,
          overrides:
            typeof overrides == 'string'
              ? {
                  label: overrides,
                  caption: overrides
                }
              : overrides
        });

        expect(commands.label(semanticCommandId)).toEqual(expected);
        expect(commands.caption(semanticCommandId)).toEqual(
          expected.replace(/label/g, 'caption')
        );
      }
    );
  });
});
