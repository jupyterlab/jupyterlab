// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

/**
 * A namespace for TextItem statics.
 */
export namespace TextItem {
  /**
   * Props for a TextItem.
   */
  export interface IProps {
    /**
     * The content of the text item.
     */
    source: string | number;

    /**
     * Hover text to give to the node.
     */
    title?: string;
  }
}

/**
 * A functional tsx component for a text item.
 */
export function TextItem(
  props: TextItem.IProps & React.HTMLAttributes<HTMLSpanElement>
): React.ReactElement<TextItem.IProps> {
  const { title, source, className, ...rest } = props;
  return (
    <span
      className={`jp-StatusBar-TextItem ${className}`}
      title={title}
      {...rest}
    >
      {source}
    </span>
  );
}
