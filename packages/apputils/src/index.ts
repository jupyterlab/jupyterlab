// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module apputils
 */
import { Toolbar as UIToolbar } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';
import { Toolbar as ApputilsToolbar } from './toolbar';

/**
 * @deprecated since v4
 * The widgets are now in @jupyterlab/ui-components
 */
export {
  addCommandToolbarButtonClass,
  addToolbarButtonClass,
  Collapser as Collapse,
  CommandToolbarButton,
  CommandToolbarButtonComponent,
  IFrame,
  IUseSignalProps,
  IUseSignalState,
  ReactWidget,
  Spinner,
  Styling,
  ToolbarButton,
  ToolbarButtonComponent,
  UseSignal,
  VDomModel,
  VDomRenderer
} from '@jupyterlab/ui-components';

export * from './clipboard';
export * from './commandlinker';
export * from './commandpalette';
export * from './dialog';
export * from './domutils';
export * from './hoverbox';
export * from './inputdialog';
export * from './mainareawidget';
export * from './menufactory';
export * from './printing';
export * from './sanitizer';
export * from './sessioncontext';
export * from './thememanager';
export * from './tokens';
export {
  ToolbarWidgetRegistry,
  createDefaultFactory,
  createToolbarFactory
} from './toolbar';
export * from './widgettracker';
export * from './windowresolver';
export * from './kernelstatuses';

// Merge Toolbar namespace to preserve API
/**
 * @deprecated since v4
 * This class is in @jupyterlab/ui-components
 */
export class Toolbar<T extends Widget = Widget> extends UIToolbar<T> {}

export namespace Toolbar {
  export const createInterruptButton = ApputilsToolbar.createInterruptButton;
  export const createKernelNameItem = ApputilsToolbar.createKernelNameItem;
  export const createKernelStatusItem = ApputilsToolbar.createKernelStatusItem;
  export const createRestartButton = ApputilsToolbar.createRestartButton;
  /**
   * @deprecated since v4
   * This helper function is in @jupyterlab/ui-components
   */
  export const createSpacerItem = UIToolbar.createSpacerItem;
}
