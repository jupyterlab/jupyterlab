/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { SemanticCommand } from '@jupyterlab/apputils';
import { TranslationBundle } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { JupyterFrontEnd } from './frontend';

export interface ISemanticCommandDefault {
  /**
   * Default command to execute if no command is enabled
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
 * Create the command options from the given semantic commands list
 * and the given default values.
 *
 * @param app Jupyter Application
 * @param semanticCommands Single semantic command  or a list of commands
 * @param defaultValues Default values
 * @param trans Translation bundle
 * @returns Command options
 */
export function createSemanticCommand(
  app: JupyterFrontEnd,
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
          result = await commands.execute(commandId!);
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
      const texts = reduceAttribute(attribute);

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
