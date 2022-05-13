import * as React from 'react';

import { classes } from 'typestyle';

import {
  CurrentHeaderStyle,
  HeaderStyle,
  SortButtonStyle
} from '../componentStyle/ShortcutTitleItemStyle.js';

export interface IShortcutTitleItemProps {
  title: string;
  updateSort: Function;
  active: string;
}

export class ShortcutTitleItem extends React.Component<IShortcutTitleItemProps> {
  render(): JSX.Element {
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
