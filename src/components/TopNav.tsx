import * as React from 'react';

import {
  classes
} from 'typestyle'

import {
  TopNavStyle,
  SymbolsStyle,
  SymbolsRowStyle,
  SearchContainerStyle,
  SearchStyle,
  AdvancedOptionsStyle,
  AdvancedOptionsRightStyle,
  AdvancedOptionsLinkStyle,
  AdvancedOptionsLinkRightStyle,
} from './TopNavStyle'

/** State for TopNav component */
export interface ITopNavProps {
  resetShortcuts: Function;
  updateSearchQuery: Function;
  openAdvanced: Function;
  toggleSelectors: Function;
  showSelectors: boolean;
}

/** React component for top navigation */
export class TopNav extends React.Component<ITopNavProps, {}> {
  render() {
    return (
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
      <div className = {SearchContainerStyle}>
        <input 
          onChange={(event) => this.props.updateSearchQuery(event)} 
          className={SearchStyle}
          placeholder='Search'
        />
      </div>

      <div className={AdvancedOptionsStyle}>
        <a className={AdvancedOptionsLinkStyle} onClick={() => this.props.openAdvanced()}>
          Advanced Editor
        </a>
        <a className={AdvancedOptionsLinkStyle} onClick={() => this.props.toggleSelectors()}>
          {this.props.showSelectors ? 'Hide Selectors' : 'Show Selectors'}
        </a>
      </div>
      <div className={classes(AdvancedOptionsStyle, AdvancedOptionsRightStyle)}>
        <a className={classes(AdvancedOptionsLinkStyle, AdvancedOptionsLinkRightStyle)} onClick={() => this.props.resetShortcuts()}>
          Reset All
        </a>
      </div>
    </div>
  )}
}