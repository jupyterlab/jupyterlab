import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { CommandRegistry } from '@lumino/commands';
import { Menu } from '@lumino/widgets';
import { IDisposable } from '@lumino/disposable';

import * as React from 'react';

import { classes } from 'typestyle';

import { CellStyle } from '../componentStyle/ShortcutItemStyle';

import {
  AdvancedOptionsContainerStyle,
  AdvancedOptionsLinkStyle,
  AdvancedOptionsSmallStyle,
  AdvancedOptionsStyle,
  altIconStyle,
  commandIconStyle,
  controlIconStyle,
  HeaderRowContainerStyle,
  HeaderRowStyle,
  SearchContainerStyle,
  SearchStyle,
  SymbolsRowStyle,
  SymbolsSmallStyle,
  SymbolsStyle,
  TopNavStyle,
  TopStyle
} from '../componentStyle/TopNavStyle';

import { ShortcutTitleItem } from './ShortcutTitleItem';

import { UISize } from './ShortcutUI';

export interface IAdvancedOptionsProps {
  size: UISize;
  openAdvanced: Function;
  toggleSelectors: Function;
  showSelectors: boolean;
  resetShortcuts: Function;
  menu: Menu;
}

export interface ISymbolsProps {
  size: UISize;
}

/** All external actions, setting commands, getting command list ... */
export interface IShortcutUIexternal {
  getAllShortCutSettings: () => Promise<ISettingRegistry.ISettings>;
  removeShortCut: (key: string) => Promise<void>;
  openAdvanced: () => void;
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
  export const advancedEditor = 'shortcutui:advancedEditor';
  export const resetAll = 'shortcutui:resetAll';
}

class Symbols extends React.Component<ISymbolsProps, {}> {
  getRegularSymbols() {
    return (
      <div className={SymbolsStyle}>
        <div className={SymbolsRowStyle}>
          <div>Cmd ⌘</div>
          <div>Alt ⌥</div>
          <div>Ctrl ⌃</div>
          <div>Shift ⇧</div>
        </div>
      </div>
    );
  }

  getSmallSymbols() {
    return (
      <div className={classes(SymbolsStyle, SymbolsSmallStyle)}>
        <div className={SymbolsRowStyle}>
          <span>Cmd </span>
          <span className={commandIconStyle}>⌘</span>
          <span>Alt </span>
          <span className={altIconStyle}>⌥</span>
        </div>
        <div className={SymbolsRowStyle}>
          <span>Ctrl </span>
          <span className={controlIconStyle}>⌃</span>
          <span>Shift </span>
          <span>⇧</span>
        </div>
      </div>
    );
  }

  getTinySymbols() {
    return (
      <div className={classes(SymbolsStyle, SymbolsSmallStyle)}>
        <div className={SymbolsRowStyle}>
          <span>Cmd</span>
          <span>⌘</span>
        </div>
        <div className={SymbolsRowStyle}>
          <span>Alt</span>
          <span>⌥</span>
        </div>
        <div className={SymbolsRowStyle}>
          <span>Ctrl</span>
          <span>⌃</span>
        </div>
        <div className={SymbolsRowStyle}>
          <span>Shift</span>
          <span>⇧</span>
        </div>
      </div>
    );
  }

  render() {
    switch (this.props.size) {
      case UISize.Regular:
        return this.getRegularSymbols();
      case UISize.Small:
        return this.getSmallSymbols();
      case UISize.Tiny:
        return this.getTinySymbols();
    }
  }
}

class AdvancedOptions extends React.Component<IAdvancedOptionsProps, {}> {
  render() {
    if (this.props.size === UISize.Regular) {
      return (
        <div className={AdvancedOptionsContainerStyle}>
          <div className={AdvancedOptionsStyle}>
            <a
              className={AdvancedOptionsLinkStyle(this.props.size)}
              onClick={() => this.props.openAdvanced()}
            >
              Advanced Editor
            </a>
            <a
              className={AdvancedOptionsLinkStyle(this.props.size)}
              onClick={() => this.props.toggleSelectors()}
            >
              {this.props.showSelectors ? 'Hide Selectors' : 'Show Selectors'}
            </a>
            <a
              className={classes(AdvancedOptionsLinkStyle(this.props.size))}
              onClick={() => this.props.resetShortcuts()}
            >
              Reset All
            </a>
          </div>
        </div>
      );
    } else {
      return (
        <div
          className={classes(AdvancedOptionsStyle, AdvancedOptionsSmallStyle)}
        >
          <a
            className={AdvancedOptionsLinkStyle(this.props.size)}
            onClick={() => this.props.openAdvanced()}
          >
            Advanced Editor
          </a>
          <a
            className={AdvancedOptionsLinkStyle(this.props.size)}
            onClick={() => this.props.toggleSelectors()}
          >
            {this.props.showSelectors ? 'Hide Selectors' : 'Show Selectors'}
          </a>
          <a
            className={classes(AdvancedOptionsLinkStyle(this.props.size))}
            onClick={() => this.props.resetShortcuts()}
          >
            Reset All
          </a>
        </div>
      );
    }
  }
}

/** State for TopNav component */
export interface ITopNavProps {
  resetShortcuts: Function;
  updateSearchQuery: Function;
  openAdvanced: Function;
  toggleSelectors: Function;
  showSelectors: boolean;
  updateSort: Function;
  currentSort: string;
  width: number;
  external: IShortcutUIexternal;
}

/** React component for top navigation */
export class TopNav extends React.Component<ITopNavProps, {}> {
  menu: Menu;
  constructor(props: any) {
    super(props);

    this.addMenuCommands();
    this.menu = this.props.external.createMenu();
    this.menu.addItem({ command: CommandIDs.showSelectors });
    this.menu.addItem({ command: CommandIDs.advancedEditor });
    this.menu.addItem({ command: CommandIDs.resetAll });
  }

  addMenuCommands() {
    if (!this.props.external.hasCommand(CommandIDs.showSelectors)) {
      this.props.external.addCommand(CommandIDs.showSelectors, {
        label: 'Toggle Selectors',
        caption: 'Toggle command selectors',
        execute: () => {
          this.props.toggleSelectors();
        }
      });
    }
    if (!this.props.external.hasCommand(CommandIDs.advancedEditor)) {
      this.props.external.addCommand(CommandIDs.advancedEditor, {
        label: 'Advanced Editor',
        caption: 'Open advanced editor',
        execute: () => {
          this.props.openAdvanced();
        }
      });
    }
    if (!this.props.external.hasCommand(CommandIDs.resetAll)) {
      this.props.external.addCommand(CommandIDs.resetAll, {
        label: 'Reset All',
        caption: 'Reset all shortcuts',
        execute: () => {
          this.props.resetShortcuts();
        }
      });
    }
  }

  getSize = (width: number): UISize => {
    if (width < 730) {
      return UISize.Tiny;
    } else if (width < 1260) {
      return UISize.Small;
    } else {
      return UISize.Regular;
    }
  };

  getShortCutTitleItem(title: string) {
    return (
      <div className={CellStyle}>
        <ShortcutTitleItem
          title={title}
          updateSort={this.props.updateSort}
          active={this.props.currentSort}
        />
      </div>
    );
  }

  render() {
    return (
      <div className={TopStyle}>
        <div className={TopNavStyle}>
          <Symbols size={this.getSize(this.props.width)} />
          <div className={SearchContainerStyle}>
            <input
              onChange={event => this.props.updateSearchQuery(event)}
              className={SearchStyle}
              placeholder="Search"
            />
          </div>
          <AdvancedOptions
            size={this.getSize(this.props.width)}
            openAdvanced={this.props.openAdvanced}
            toggleSelectors={this.props.toggleSelectors}
            showSelectors={this.props.showSelectors}
            resetShortcuts={this.props.resetShortcuts}
            menu={this.menu}
          />
        </div>
        <div className={HeaderRowContainerStyle}>
          <div className={HeaderRowStyle}>
            {this.getShortCutTitleItem('Category')}
            {this.getShortCutTitleItem('Command')}
            <div className={CellStyle}>
              <div className="title-div">Shortcut</div>
            </div>
            {this.getShortCutTitleItem('Source')}
            {this.props.showSelectors && this.getShortCutTitleItem('Selectors')}
          </div>
        </div>
      </div>
    );
  }
}
