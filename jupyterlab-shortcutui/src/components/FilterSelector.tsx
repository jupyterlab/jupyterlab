import * as React from 'react';

export interface FilterSelectorState {
    value: string;
}

export interface FilterSelectorProps {
    updateFilter: Function;
}

/** A React component to filter the shortcut list */
export class FilterSelector extends React.Component<FilterSelectorProps, FilterSelectorState> {
  state = {
    value: 'category'
  }

  updateFilter = (event) => {
    this.setState({value: event.target.value}, this.props.updateFilter(this.state.value))
  }
  render() {
    return (
      <select className="jp-shortcut-filter" onChange={(event) => this.updateFilter(event)} defaultValue={this.state.value}>
        <option value="category">Category</option>
        <option value="command">Command</option>
        <option value="source">Source</option>
        <option value="selector">Selector</option>
      </select>
    )
  }
}