import {
  FilterSelector
} from './FilterSelector'

import * as React from 'react';

/** State for TopNav component */
export interface ITopNavProps {
    resetShortcuts: Function;
    updateSearchQuery: Function;
    openAdvanced: Function;
    toggleSelectors: Function;
    updateFilter: Function;
}

/** React component for top navigation*/
export class TopNav extends React.Component<ITopNavProps, {}> {
  render() {return (
    <div className='jp-shortcuttopnav'>
      <a className='jp-link' 
        onClick={() => this.props.resetShortcuts()
      }>
        Reset All
      </a>
      <FilterSelector updateFilter={this.props.updateFilter} />
      <div className = 'jp-searchcontainer'>
        <input 
          onChange={(event) => 
            this.props.updateSearchQuery(event)
          } 
          className='jp-search'>
        </input>
      </div>
      <a className='jp-link' onClick={() => this.props.openAdvanced()}>
        Advanced Editor
      </a>
      <a className='jp-link' onClick={() => this.props.toggleSelectors()}>
        Toggle Selectors
      </a>
    </div>
  )}
}