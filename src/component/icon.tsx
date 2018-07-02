import * as React from 'react';

export interface IProps {
  source: string;
}

export class IconItem extends React.Component<IProps, null> {
  render() {
    return (
      <div>
        <img src={this.props.source} height="20px" />
      </div>
    );
  }
}
