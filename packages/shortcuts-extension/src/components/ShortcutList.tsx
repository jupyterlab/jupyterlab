/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { ITranslator } from '@jupyterlab/translation';
import * as React from 'react';
import { ShortcutItem } from './ShortcutItem';
import { ShortcutTitleItem } from './ShortcutTitleItem';
import type { IShortcutRegistry, IShortcutTarget, IShortcutUI } from '../types';

/** Props for ShortcutList component */
export interface IShortcutListProps {
  shortcuts: IShortcutTarget[];
  addKeybinding: IShortcutUI['addKeybinding'];
  replaceKeybinding: IShortcutUI['replaceKeybinding'];
  resetKeybindings: IShortcutUI['resetKeybindings'];
  deleteKeybinding: IShortcutUI['deleteKeybinding'];
  findConflictsFor: IShortcutRegistry['findConflictsFor'];
  setCustomOptions: IShortcutUI['setCustomOptions'];
  showSelectors: boolean;
  external: IShortcutUI.IExternalBundle;
  updateSort: IShortcutUI['updateSort'];
  currentSort: IShortcutUI.ColumnId;
  sortDirection: IShortcutUI.SortDirection;
  translator: ITranslator;
  /** Optional new-shortcut row rendered as the first tbody row. */
  newShortcutRow?: React.ReactNode;
}

/** React component for list of shortcuts */
export class ShortcutList extends React.Component<IShortcutListProps> {
  private getTitleHeader(
    title: string,
    columnId: IShortcutUI.ColumnId
  ): JSX.Element {
    const isActive = columnId === this.props.currentSort;
    return (
      <th
        scope="col"
        className="jp-Shortcuts-Cell"
        aria-sort={isActive ? this.props.sortDirection : undefined}
      >
        <ShortcutTitleItem
          title={title}
          updateSort={this.props.updateSort}
          active={this.props.currentSort}
          sortDirection={this.props.sortDirection}
          columnId={columnId}
        />
      </th>
    );
  }

  render(): JSX.Element {
    const trans = this.props.translator.load('jupyterlab');
    return (
      <div
        className="jp-Shortcuts-ShortcutListContainer"
        id="shortcutListContainer"
      >
        <table className="jp-Shortcuts-ShortcutList">
          <caption className="jp-sr-only">
            {trans.__(
              'Keyboard shortcuts. Column header buttons sort the table.'
            )}
          </caption>
          <thead>
            <tr className="jp-Shortcuts-HeaderRow">
              {this.getTitleHeader(trans.__('Category'), 'category')}
              {this.getTitleHeader(trans.__('Command'), 'command')}
              <th scope="col" className="jp-Shortcuts-Cell">
                <div className="title-div">{trans.__('Shortcut')}</div>
              </th>
              {this.getTitleHeader(trans.__('Source'), 'source')}
              {this.props.showSelectors &&
                this.getTitleHeader(trans.__('Selectors'), 'selector')}
            </tr>
          </thead>
          <tbody>
            {this.props.newShortcutRow}
            {this.props.shortcuts.map((shortcut: IShortcutTarget) => {
              return (
                <ShortcutItem
                  key={shortcut.id}
                  addKeybinding={this.props.addKeybinding}
                  replaceKeybinding={this.props.replaceKeybinding}
                  deleteKeybinding={this.props.deleteKeybinding}
                  resetKeybindings={this.props.resetKeybindings}
                  findConflictsFor={this.props.findConflictsFor}
                  setCustomOptions={this.props.setCustomOptions}
                  shortcut={shortcut}
                  showSelectors={this.props.showSelectors}
                  external={this.props.external}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}
