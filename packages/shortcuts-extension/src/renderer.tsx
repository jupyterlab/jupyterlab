import React from 'react';
import { IShortcutUIexternal, ShortcutUI } from './components/index.js';

export const renderShortCut = (props: {
  external: IShortcutUIexternal;
}): JSX.Element => {
  return <ShortcutUI external={props.external} height={1000} width={1000} />;
};
