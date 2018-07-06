import * as React from 'react';

/** Props for SortSelector component */

export interface SortSelectorState {
    value: string
}
/** Props for SortSelector component */
export interface SortSelectorProps {
    updateSort: Function
}

/** A React component to filter the shortcut list */
export class SortSelector extends React.Component<SortSelectorProps, SortSelectorState> {
  state = {
    value: 'category'
  }

  /** Update the current critera sorting the list of shortcuts */
  updateSort = (event) => {
    this.setState({value: event.target.value}, this.props.updateSort(event.target.value))
  }

  render() {
    return (
      <select className="jp-shortcut-filter" onChange={(event) => this.updateSort(event)} value={this.state.value}>
        <option value="category">Category</option>
        <option value="command">Command</option>
        <option value="source">Source</option>
        <option value="selector">Selector</option>
      </select>
    )
  }
}