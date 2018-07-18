import * as React from 'react';

import { classes } from 'typestyle';

import {
  HeaderStyle,
  SortButtonStyle,
  CurrentHeaderStyle
} from './ShortcutTitleItemStyle';

export interface IShortcutTitleItemProps {
  title: string;
  updateSort: Function;
  active: string;
}

export class ShortcutTitleItem extends React.Component<
  IShortcutTitleItemProps
> {
  render() {
    return (
      <div
        className={
          this.props.title.toLowerCase() === this.props.active
            ? classes(HeaderStyle, CurrentHeaderStyle)
            : HeaderStyle
        }
        onClick={() => this.props.updateSort(this.props.title.toLowerCase())}
      >
        {this.props.title}
        <div className={SortButtonStyle}>⌃</div>
      </div>
    );
  }
}
