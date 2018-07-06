import * as React from 'react';

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
      <a className='jp-link jp-link-left' onClick={() => this.props.resetShortcuts()}>
        Reset All
      </a>
      <div className = 'jp-searchcontainer'>
        <input 
          onChange={(event) => this.props.updateSearchQuery(event)} 
          className='jp-search'
          placeholder='Search'
        />
      </div>
      <div className='advanced-options'>
        <a className='jp-link' onClick={() => this.props.openAdvanced()}>
          Advanced Editor
        </a>
        <a className='jp-link' onClick={() => this.props.toggleSelectors()}>
          {this.props.showSelectors ? 'Hide Selectors' : 'Show Selectors'}
        </a>
      </div>
    </div>
  )}
}