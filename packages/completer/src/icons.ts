// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { LabIcon } from '@jupyterlab/ui-components';

import inlineSvgStr from '../style/icons/inline.svg';
import widgetSvgStr from '../style/icons/widget.svg';

export const inlineCompleterIcon = new LabIcon({
  name: 'completer:inline',
  svgstr: inlineSvgStr
});

export const completerWidgetIcon = new LabIcon({
  name: 'completer:widget',
  svgstr: widgetSvgStr
});
