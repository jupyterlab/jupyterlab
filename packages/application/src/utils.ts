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
  const commandList =
    semanticCommands instanceof Array ? semanticCommands : [semanticCommands];

  return {
    label: () => {
      const widget = shell.currentWidget;
      const commandIds = commandList.map(cmd =>
        widget !== null ? cmd.getActiveCommandId(widget) : null
      );
      const labels = commandIds
        .filter(commandId => commandId !== null)
        .map(commandId => commands.label(commandId!));
      switch (labels.length) {
        case 0:
          return defaultValues.label ?? '';
        case 1:
          return labels[0];
        default: {
          const hasEllipsis = labels.some(l => /…$/.test(l));
          const main = labels
            .slice(undefined, -1)
            .map(l => l.replace(/…$/, ''))
            .join(', ');
          const end = labels.slice(-1)[0] + (hasEllipsis ? '…' : '');
          return trans.__('%1 and %2', main, end);
        }
      }
    },
    caption: () => {
      const widget = shell.currentWidget;
      const commandIds = commandList.map(cmd =>
        widget !== null ? cmd.getActiveCommandId(widget) : null
      );
      const captions = commandIds
        .filter(commandId => commandId !== null)
        .map(commandId => commands.caption(commandId!));

      switch (captions.length) {
        case 0:
          return defaultValues.label ?? '';
        case 1:
          return captions[0];
        default: {
          const hasEllipsis = captions.some(c => /…$/.test(c));
          const main = captions
            .slice(undefined, -1)
            .map(c => c.replace(/…$/, ''))
            .join(', ');
          const end = captions.slice(-1)[0] + (hasEllipsis ? '…' : '');
          return trans.__('%1 and %2', main, end);
        }
      }
    },
    isEnabled: () => {
      const widget = shell.currentWidget;
      const commandIds = commandList.map(cmd =>
        widget !== null ? cmd.getActiveCommandId(widget) : null
      );
      const isEnabled = commandIds
        .filter(commandId => commandId !== null)
        .map(commandId => commands.isEnabled(commandId!));
      return (
        (isEnabled.length > 0 &&
          !isEnabled.some(enabled => enabled === false)) ||
        (defaultValues.isEnabled ?? false)
      );
    },
    isToggled: () => {
      const widget = shell.currentWidget;
      const commandIds = commandList.map(cmd =>
        widget !== null ? cmd.getActiveCommandId(widget) : null
      );
      const isToggled = commandIds
        .filter(commandId => commandId !== null)
        .map(commandId => commands.isToggled(commandId!));
      return (
        isToggled.some(enabled => enabled === true) ||
        (defaultValues.isToggled ?? false)
      );
    },
    isVisible: () => {
      const widget = shell.currentWidget;
      const commandIds = commandList.map(cmd =>
        widget !== null ? cmd.getActiveCommandId(widget) : null
      );
      const isVisible = commandIds
        .filter(commandId => commandId !== null)
        .map(commandId => commands.isVisible(commandId!));
      return (
        !isVisible.some(visible => visible === false) ||
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
}
