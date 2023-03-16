/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { IShortcutUIexternal, ShortcutUI } from './components';

export const renderShortCut = (props: {
  external: IShortcutUIexternal;
}): JSX.Element => {
  return <ShortcutUI external={props.external} height={1000} width={1000} />;
};
