/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Widget } from '@lumino/widgets';

/**
 * Options when add a command to a semantic group.
 */
interface ISemanticCommand {
  /**
   * Command id
   */
  id: string;
  /**
   * Whether this command is enabled for a given widget
   * @param widget Widget
   */
  isEnabled?(widget: Widget): boolean;
  /**
   * Command rank in the semantic group
   *
   * #### Note
   * If multiple commands are enabled at the same time,
   * the one with the smallest rank will be executed.
   */
  rank?: number;
}

/**
 * Semantic group of commands
 */
export class SemanticCommand {
  /**
   * Default rank for semantic command
   */
  static readonly DEFAULT_RANK = 500;

  /**
   * The `args` key for a semantic command's current widget ID.
   */
  static readonly WIDGET = 'semanticWidget';

  /**
   * The command IDs used by this semantic command.
   */
  get ids(): string[] {
    return this._commands.map(c => c.id);
  }

  /**
   * Add a command to the semantic group
   *
   * @param command Command to add
   */
  add(command: ISemanticCommand): void {
    if (this._commands.map(c => c.id).includes(command.id)) {
      throw Error(`Command ${command.id} is already defined.`);
    }

    this._commands.push({
      isEnabled: () => true,
      rank: SemanticCommand.DEFAULT_RANK,
      ...command
    });
  }

  /**
   * Get the command id of the enabled command from this group
   * for the given widget.
   *
   * @param widget Widget
   * @returns Command id
   */
  getActiveCommandId(widget: Widget): string | null {
    const commands = this._commands
      .filter(c => c.isEnabled(widget))
      .sort((a, b) => {
        const rankDelta = a.rank - b.rank;
        return rankDelta || (a.id < b.id ? -1 : 1);
      });

    const command = commands[0] ?? { id: null };
    return command.id;
  }

  /**
   * Remove a command ID.
   *
   * @param id Command ID to remove
   */
  remove(id: string): void {
    const index = this._commands.findIndex(c => c.id === id);
    if (index >= 0) {
      this._commands.splice(index, 1);
    }
  }

  protected _commands = new Array<Required<ISemanticCommand>>();
}
