/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { ShortcutUI } from './components';
import { IShortcutUI } from './types';

export const renderShortCut = (props: {
  external: IShortcutUI.IExternalBundle;
}): JSX.Element => {
  return <ShortcutUI external={props.external} height={1000} width={1000} />;
};
