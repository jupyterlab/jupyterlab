/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { SemanticCommand } from '@jupyterlab/apputils';
import { nullTranslator, TranslationBundle } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { JupyterFrontEnd } from './frontend';

export interface ISemanticCommandDefault {
  /**
   * Default command id to execute if no command is enabled
   */
  execute?: string;
  /**
   * Default command label
   */
  label?: string;
  /**
   * Default command caption
   */
  caption?: string;
  /**
   * Whether the default command is enabled.
   */
  isEnabled?: boolean;
  /**
   * Whether the default command is toggled.
   */
  isToggled?: boolean;
  /**
   * Whether the default command is visible.
   */
  isVisible?: boolean;
}

/**
 * Semantic command(s) options
 */
export interface ISemanticCommandOptions {
  /**
   * Semantic command ID
   */
  id: string;
  /**
   * Application command registry
   */
  commands: CommandRegistry;
  /**
   * Application shell
   */
  shell: JupyterFrontEnd.IShell;
  /**
   * Semantic commands
   */
  semanticCommands: SemanticCommand | SemanticCommand[];
  /**
   * Default commands options
   *
   * It will be used if the enabled command is not defining one
   * or if no command is enabled.
   */
  default?: ISemanticCommandDefault;
  /**
   * Override commands options
   *
   * It will override the enabled command attribute.
   */
  overrides?: Omit<CommandRegistry.ICommandOptions, 'execute'>;
  /**
   * Domain specific translation object.
   */
  trans?: TranslationBundle;
}

/**
 * Add a semantic commands to the application and take care
 * of setting up the command changed signal.
 *
 * @param options Semantic command options
 */
export function addSemanticCommand(options: ISemanticCommandOptions): void {
  const {
    id,
    commands,
    shell,
    semanticCommands,
    default: defaultValues,
    overrides,
    trans
  } = options;
  commands.addCommand(id, {
    ...createSemanticCommand(
      { commands, shell },
      semanticCommands,
      defaultValues ?? {},
      trans ?? nullTranslator.load('jupyterlab')
    ),
    ...overrides
  });
  const commandList = Array.isArray(semanticCommands)
    ? semanticCommands
    : [semanticCommands];

  const onCommandChanged = (
    commands: CommandRegistry,
    args: CommandRegistry.ICommandChangedArgs
  ) => {
    if (args.id) {
      if (args.id === id && args.type === 'removed') {
        commands.commandChanged.disconnect(onCommandChanged);
      } else {
        const commandIds = commandList.reduce<string[]>(
          (agg, cmd) => agg.concat(cmd.ids),
          []
        );
        if (commandIds.includes(args.id)) {
          switch (args.type) {
            case 'changed':
            case 'many-changed':
              commands.notifyCommandChanged(id);
              break;
            case 'removed':
              for (const cmd of commandList) {
                cmd.remove(args.id);
              }
              break;
          }
        }
      }
    }
  };

  commands.commandChanged.connect(onCommandChanged);
}

/**
 * Create the command options from the given semantic commands list
 * and the given default values.
 *
 * @param app Jupyter Application
 * @param semanticCommands Single semantic command  or a list of commands
 * @param defaultValues Default values
 * @param trans Translation bundle
 * @returns Command options
 *
 * @deprecated Please use {@link addSemanticCommand}. This function will
 * be removed of the public API in JupyterLab 5.
 */
export function createSemanticCommand(
  app:
    | JupyterFrontEnd
    | { commands: CommandRegistry; shell: JupyterFrontEnd.IShell },
  semanticCommands: SemanticCommand | SemanticCommand[],
  defaultValues: ISemanticCommandDefault,
  trans: TranslationBundle
): CommandRegistry.ICommandOptions {
  const { commands, shell } = app;
  const commandList = Array.isArray(semanticCommands)
    ? semanticCommands
    : [semanticCommands];

  return {
    label: concatenateTexts('label'),
    caption: concatenateTexts('caption'),
    isEnabled: () => {
      const isEnabled = reduceAttribute('isEnabled');
      return (
        (isEnabled.length > 0 &&
          !isEnabled.some(enabled => enabled === false)) ||
        (defaultValues.isEnabled ?? false)
      );
    },
    isToggled: () => {
      const isToggled = reduceAttribute('isToggled');
      return (
        isToggled.some(enabled => enabled === true) ||
        (defaultValues.isToggled ?? false)
      );
    },
    isVisible: () => {
      const isVisible = reduceAttribute('isVisible');
      return (
        (isVisible.length > 0 &&
          !isVisible.some(visible => visible === false)) ||
        (defaultValues.isVisible ?? true)
      );
    },
    execute: async () => {
      const widget = shell.currentWidget;
      const commandIds = commandList.map(cmd =>
        widget !== null ? cmd.getActiveCommandId(widget) : null
      );
      const toExecute = commandIds.filter(
        commandId => commandId !== null && commands.isEnabled(commandId)
      );

      let result: any = null;
      if (toExecute.length > 0) {
        for (const commandId of toExecute) {
          const args = { [SemanticCommand.WIDGET]: widget!.id };
          result = await commands.execute(commandId!, args);
          if (typeof result === 'boolean' && result === false) {
            // If a command returns a boolean, assume it is the execution success status
            // So break if it is false.
            break;
          }
        }
      } else if (defaultValues.execute) {
        result = await commands.execute(defaultValues.execute);
      }
      return result;
    }
  };

  function reduceAttribute(
    attribute: keyof CommandRegistry.ICommandOptions
  ): any[] {
    const widget = shell.currentWidget;
    const commandIds = commandList.map(cmd =>
      widget !== null ? cmd.getActiveCommandId(widget) : null
    );
    const attributes = commandIds
      .filter(commandId => commandId !== null)
      .map(commandId => commands[attribute](commandId!));
    return attributes;
  }

  function concatenateTexts(
    attribute: 'label' | 'caption'
  ): string | CommandRegistry.CommandFunc<string> | undefined {
    return () => {
      const texts = (reduceAttribute(attribute) as string[]).map(
        (text, textIndex) =>
          attribute == 'caption' && textIndex > 0
            ? text.toLocaleLowerCase()
            : text
      );

      switch (texts.length) {
        case 0:
          return defaultValues[attribute] ?? '';
        case 1:
          return texts[0];
        default: {
          const hasEllipsis = texts.some(l => /…$/.test(l));
          const main = texts
            .slice(undefined, -1)
            .map(l => l.replace(/…$/, ''))
            .join(', ');
          const end =
            texts.slice(-1)[0].replace(/…$/, '') + (hasEllipsis ? '…' : '');
          return trans.__('%1 and %2', main, end);
        }
      }
    };
  }
}
