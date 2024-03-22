/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { ShortcutUI } from './components';
import { IExternalBundle } from './types';

export const renderShortCut = (props: {
  external: IExternalBundle;
}): JSX.Element => {
  return <ShortcutUI external={props.external} height={1000} width={1000} />;
};
