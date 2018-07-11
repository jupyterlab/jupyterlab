import * as React from 'react';

import '../../style/TopNav.css';

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
    <div className='jp-shortcuttopnav'>
      <div className='jp-shortcut-symbols'>
        <div className='nav-row'>
          <div>Command ⌘</div>
          <div>Alt ⌥</div>
        </div>
        <div className='nav-row'>
          <div>Shift ⇧</div>
          <div>Control ⌃</div>
        </div>
      </div>
      <div className = 'jp-searchcontainer'>
        <input 
          onChange={(event) => this.props.updateSearchQuery(event)} 
          className='jp-search'
          placeholder='Search'
        />
      </div>

      <div className='advanced-options advanced-options-left'>
        <a className='jp-link' onClick={() => this.props.openAdvanced()}>
          Advanced Editor
        </a>
        <a className='jp-link' onClick={() => this.props.toggleSelectors()}>
          {this.props.showSelectors ? 'Hide Selectors' : 'Show Selectors'}
        </a>
      </div>
      <div className='advanced-options advanced-options-right'>
        <a className='jp-link' onClick={() => this.props.resetShortcuts()}>
          Reset All
        </a>
      </div>
    </div>
  )}
}