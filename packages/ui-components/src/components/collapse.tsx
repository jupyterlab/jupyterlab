import React from 'react';

/**
 * Collapse component property
 */
export interface ICollapseProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether the component is open or closed.
   *
   * @default false
   */
  isOpen?: boolean;
}

/**
 * Collapse component
 *
 * @param props Component properties
 * @returns Component
 */
export function Collapse(props: ICollapseProps): JSX.Element {
  const { children, isOpen, ...others } = props;
  others['aria-hidden'] = !!isOpen;
  return <div {...others}>{isOpen && children}</div>;
}
