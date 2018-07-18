import * as React from 'react';

import { classes } from 'typestyle';

import {
  TopStyle,
  TopNavStyle,
  SymbolsStyle,
  SymbolsRowStyle,
  SearchContainerStyle,
  SearchStyle,
  AdvancedOptionsStyle,
  AdvancedOptionsRightStyle,
  AdvancedOptionsLinkStyle,
  AdvancedOptionsLinkRightStyle,
  HeaderRowStyle
} from './TopNavStyle';

import { CellStyle, RowStyle } from './ShortcutItemStyle';

import { ShortcutTitleItem } from './ShortcutTitleItem';

/** State for TopNav component */
export interface ITopNavProps {
  resetShortcuts: Function;
  updateSearchQuery: Function;
  openAdvanced: Function;
  toggleSelectors: Function;
  showSelectors: boolean;
  updateSort: Function;
  currentSort: string;
}

/** React component for top navigation */
export class TopNav extends React.Component<ITopNavProps, {}> {
  render() {
    return (
      <div className={TopStyle}>
        <div className={TopNavStyle}>
          <div className={SymbolsStyle}>
            <div className={SymbolsRowStyle}>
              <div>Command ⌘</div>
              <div>Alt ⌥</div>
            </div>
            <div className={SymbolsRowStyle}>
              <div>Shift ⇧</div>
              <div>Control ⌃</div>
            </div>
          </div>
          <div className={SearchContainerStyle}>
            <input
              onChange={event => this.props.updateSearchQuery(event)}
              className={SearchStyle}
              placeholder="Search"
            />
          </div>

          <div className={AdvancedOptionsStyle}>
            <a
              className={AdvancedOptionsLinkStyle}
              onClick={() => this.props.openAdvanced()}
            >
              Advanced Editor
            </a>
            <a
              className={AdvancedOptionsLinkStyle}
              onClick={() => this.props.toggleSelectors()}
            >
              {this.props.showSelectors ? 'Hide Selectors' : 'Show Selectors'}
            </a>
          </div>
          <div
            className={classes(AdvancedOptionsStyle, AdvancedOptionsRightStyle)}
          >
            <a
              className={classes(
                AdvancedOptionsLinkStyle,
                AdvancedOptionsLinkRightStyle
              )}
              onClick={() => this.props.resetShortcuts()}
            >
              Reset All
            </a>
          </div>
        </div>
        <div className={classes(RowStyle, HeaderRowStyle)}>
          <div className={CellStyle}>
            <ShortcutTitleItem
              title="Category"
              updateSort={this.props.updateSort}
              active={this.props.currentSort}
            />
          </div>
          <div className={CellStyle}>
            <ShortcutTitleItem
              title="Command"
              updateSort={this.props.updateSort}
              active={this.props.currentSort}
            />
          </div>
          <div className={CellStyle}>
            <div className="title-div">Shortcut</div>
          </div>
          <div className={CellStyle}>
            <ShortcutTitleItem
              title="Source"
              updateSort={this.props.updateSort}
              active={this.props.currentSort}
            />
          </div>
          {this.props.showSelectors && (
            <div className={CellStyle}>
              <ShortcutTitleItem
                title="Selectors"
                updateSort={this.props.updateSort}
                active={this.props.currentSort}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
}
