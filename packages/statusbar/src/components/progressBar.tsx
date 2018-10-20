import * as React from 'react';
import { progressBarItem, fillerItem } from '../style/progressBar';

export namespace ProgressBar {
  export interface IProps {
    percentage: number;
  }
}

// tslint:disable-next-line:variable-name
export const ProgressBar = (props: ProgressBar.IProps) => {
  return (
    <div className={progressBarItem}>
      <Filler percentage={props.percentage} />
    </div>
  );
};

export namespace Filler {
  export interface IProps {
    percentage: number;
  }
}

// tslint:disable-next-line:variable-name
export const Filler = (props: Filler.IProps) => {
  return (
    <div
      className={fillerItem}
      style={{
        width: `${props.percentage}px`
      }}
    />
  );
};
