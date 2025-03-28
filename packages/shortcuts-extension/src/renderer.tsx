/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import type { FieldProps, WidgetProps } from '@rjsf/utils';
import {
  KeyboardLayoutUI,
  LayoutDropdownWidget,
  ShortcutUI
} from './components';
import { IKeyboardLayoutRegistry, IShortcutUI } from './types';

export const renderShortCut = (
  props: FieldProps & {
    external: IShortcutUI.IExternalBundle;
  }
): JSX.Element => {
  return <ShortcutUI external={props.external} height={1000} width={1000} />;
};

export const renderKeyboardLayout = (
  props: FieldProps & {
    layoutRegistry: IKeyboardLayoutRegistry;
  }
): JSX.Element => {
  return <KeyboardLayoutUI {...props} />;
};

export const renderLayoutDropdown = (
  props: WidgetProps & { layoutRegistry: IKeyboardLayoutRegistry }
): JSX.Element => {
  return <LayoutDropdownWidget {...props} />;
};
