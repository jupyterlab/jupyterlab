import * as React from 'react';

export interface IShortcutTitleItemProps {
  title: string;
  updateSort: Function;
  active: string;
}

export class ShortcutTitleItem extends React.Component<IShortcutTitleItemProps> {
  render() {
    return (
      <div className='title-div'>
        {this.props.title}
        <button 
          className={'sort' + (
            (this.props.title).toLowerCase() === this.props.active 
              ? ' selected-sort' 
              : ''
            )
          }
          onClick={() => this.props.updateSort(this.props.title.toLowerCase())}
        >
          ⌃
        </button>
      </div>
    )
  }
}