import * as React from 'react';

import { textItem } from '../style/text';
import { classes } from 'typestyle/lib';

export namespace TextItem {
  export interface IProps {
    source: any;
    title?: string;
  }
}

// tslint:disable-next-line:variable-name
export const TextItem = (
  props: TextItem.IProps & React.HTMLAttributes<HTMLSpanElement>
): React.ReactElement<TextItem.IProps> => {
  const { title, source, className, ...rest } = props;
  return (
    <span className={classes(textItem, className)} title={title} {...rest}>
      {source}
    </span>
  );
};
