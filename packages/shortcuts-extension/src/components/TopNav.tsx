/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ITranslator } from '@jupyterlab/translation';
import { InputGroup } from '@jupyterlab/ui-components';
import { Menu } from '@lumino/widgets';
import * as React from 'react';

import { ShortcutTitleItem } from './ShortcutTitleItem';
import { IShortcutUI } from '../types';

export interface IAdvancedOptionsProps {
  toggleSelectors: Function;
  showSelectors: boolean;
  resetShortcuts: Function;
  menu: Menu;
  translator: ITranslator;
}

export interface ISymbolsProps {}

export namespace CommandIDs {
  export const showSelectors = 'shortcutui:showSelectors';
  export const resetAll = 'shortcutui:resetAll';
}

function Symbols(props: ISymbolsProps): JSX.Element {
  return (
    <div className="jp-Shortcuts-Symbols">
      <table>
        <tbody>
          <tr>
            <td>
              <kbd>Cmd</kbd>
            </td>
            <td>⌘</td>
            <td>
              <kbd>Ctrl</kbd>
            </td>
            <td>⌃</td>
          </tr>
          <tr>
            <td>
              <kbd>Alt</kbd>
            </td>
            <td>⌥</td>
            <td>
              <kbd>Shift</kbd>
            </td>
            <td>⇧</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function AdvancedOptions(props: IAdvancedOptionsProps): JSX.Element {
  const trans = props.translator.load('jupyterlab');
  return (
    <div className="jp-Shortcuts-AdvancedOptions">
      <a
        className="jp-Shortcuts-AdvancedOptionsLink"
        onClick={() => props.toggleSelectors()}
      >
        {props.showSelectors
          ? trans.__('Hide Selectors')
          : trans.__('Show Selectors')}
      </a>
      <a
        className="jp-Shortcuts-AdvancedOptionsLink"
        onClick={() => props.resetShortcuts()}
      >
        {trans.__('Reset All')}
      </a>
    </div>
  );
}

/** State for TopNav component */
export interface ITopNavProps {
  resetShortcuts: Function;
  updateSearchQuery: Function;
  toggleSelectors: Function;
  showSelectors: boolean;
  updateSort: IShortcutUI['updateSort'];
  currentSort: string;
  width: number;
  external: IShortcutUI.IExternalBundle;
}

/** React component for top navigation */
export class TopNav extends React.Component<ITopNavProps> {
  menu: Menu;
  constructor(props: ITopNavProps) {
    super(props);

    this.addMenuCommands();
    this.menu = this.props.external.createMenu();
    this.menu.addItem({ command: CommandIDs.showSelectors });
    this.menu.addItem({ command: CommandIDs.resetAll });
  }

  addMenuCommands() {
    const trans = this.props.external.translator.load('jupyterlab');
    const commands = this.props.external.commandRegistry;
    if (!commands.hasCommand(CommandIDs.showSelectors)) {
      commands.addCommand(CommandIDs.showSelectors, {
        label: trans.__('Toggle Selectors'),
        caption: trans.__('Toggle command selectors'),
        execute: () => {
          this.props.toggleSelectors();
        }
      });
    }

    if (!commands.hasCommand(CommandIDs.resetAll)) {
      commands.addCommand(CommandIDs.resetAll, {
        label: trans.__('Reset All'),
        caption: trans.__('Reset all shortcuts'),
        execute: () => {
          this.props.resetShortcuts();
        }
      });
    }
  }

  getShortCutTitleItem(title: string, columnId: IShortcutUI.ColumnId) {
    return (
      <div className="jp-Shortcuts-Cell">
        <ShortcutTitleItem
          title={title}
          updateSort={this.props.updateSort}
          active={this.props.currentSort}
          columnId={columnId}
        />
      </div>
    );
  }

  render() {
    const trans = this.props.external.translator.load('jupyterlab');
    return (
      <div className="jp-Shortcuts-Top">
        <div className="jp-Shortcuts-TopNav">
          <Symbols />
          <InputGroup
            className="jp-Shortcuts-Search"
            aria-label={trans.__('Search shortcuts')}
            type="text"
            onChange={event => this.props.updateSearchQuery(event)}
            placeholder={trans.__('Search…')}
            rightIcon="ui-components:search"
          />
          <AdvancedOptions
            toggleSelectors={this.props.toggleSelectors}
            showSelectors={this.props.showSelectors}
            resetShortcuts={this.props.resetShortcuts}
            menu={this.menu}
            translator={this.props.external.translator}
          />
        </div>
        <div className="jp-Shortcuts-HeaderRowContainer">
          <div className="jp-Shortcuts-HeaderRow">
            {this.getShortCutTitleItem(trans.__('Category'), 'category')}
            {this.getShortCutTitleItem(trans.__('Command'), 'command')}
            <div className="jp-Shortcuts-Cell">
              <div className="title-div">{trans.__('Shortcut')}</div>
            </div>
            {this.getShortCutTitleItem(trans.__('Source'), 'source')}
            {this.props.showSelectors &&
              this.getShortCutTitleItem(trans.__('Selectors'), 'selector')}
          </div>
        </div>
      </div>
    );
  }
}
