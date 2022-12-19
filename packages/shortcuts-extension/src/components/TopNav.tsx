/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import { InputGroup } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { IDisposable } from '@lumino/disposable';
import { Menu } from '@lumino/widgets';
import * as React from 'react';

import { ShortcutTitleItem } from './ShortcutTitleItem';

export interface IAdvancedOptionsProps {
  toggleSelectors: Function;
  showSelectors: boolean;
  resetShortcuts: Function;
  menu: Menu;
  translator: ITranslator;
}

export interface ISymbolsProps {}

/** All external actions, setting commands, getting command list ... */
export interface IShortcutUIexternal {
  translator: ITranslator;
  getAllShortCutSettings: () => Promise<ISettingRegistry.ISettings>;
  removeShortCut: (key: string) => Promise<void>;
  createMenu: () => Menu;
  hasCommand: (id: string) => boolean;
  addCommand: (
    id: string,
    options: CommandRegistry.ICommandOptions
  ) => IDisposable;
  getLabel: (id: string) => string;
}

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
  updateSort: Function;
  currentSort: string;
  width: number;
  external: IShortcutUIexternal;
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
    if (!this.props.external.hasCommand(CommandIDs.showSelectors)) {
      this.props.external.addCommand(CommandIDs.showSelectors, {
        label: trans.__('Toggle Selectors'),
        caption: trans.__('Toggle command selectors'),
        execute: () => {
          this.props.toggleSelectors();
        }
      });
    }

    if (!this.props.external.hasCommand(CommandIDs.resetAll)) {
      this.props.external.addCommand(CommandIDs.resetAll, {
        label: trans.__('Reset All'),
        caption: trans.__('Reset all shortcuts'),
        execute: () => {
          this.props.resetShortcuts();
        }
      });
    }
  }

  getShortCutTitleItem(title: string) {
    return (
      <div className="jp-Shortcuts-Cell">
        <ShortcutTitleItem
          title={title}
          updateSort={this.props.updateSort}
          active={this.props.currentSort}
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
            {this.getShortCutTitleItem(trans.__('Category'))}
            {this.getShortCutTitleItem(trans.__('Command'))}
            <div className="jp-Shortcuts-Cell">
              <div className="title-div">{trans.__('Shortcut')}</div>
            </div>
            {this.getShortCutTitleItem(trans.__('Source'))}
            {this.props.showSelectors &&
              this.getShortCutTitleItem(trans.__('Selectors'))}
          </div>
        </div>
      </div>
    );
  }
}
