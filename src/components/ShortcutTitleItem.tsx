import * as React from 'react';

import {
  classes
} from 'typestyle'

import {
  HeaderStyle,
  SortButtonStyle,
  CurrentSortButtonStyle
} from './ShortcutTitleItemStyle'

export interface IShortcutTitleItemProps {
  title: string;
  updateSort: Function;
  active: string;
}

export class ShortcutTitleItem extends React.Component<IShortcutTitleItemProps> {
  render() {
    return (
      <div className={HeaderStyle}>
        {this.props.title}
        <button 
          className={this.props.title.toLowerCase() === this.props.active 
            ? classes(SortButtonStyle, CurrentSortButtonStyle) 
            : SortButtonStyle
          }
          onClick={() => this.props.updateSort(this.props.title.toLowerCase())}
        >
          ⌃
        </button>
      </div>
    )
  }
}