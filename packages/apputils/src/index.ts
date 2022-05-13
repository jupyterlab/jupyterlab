// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module apputils
 */
import { Toolbar as UIToolbar } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';
import { Toolbar as ApputilsToolbar } from './toolbar/index.js';

/**
 * @deprecated since v4
 * These widgets are now in @jupyterlab/ui-components
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
  HoverBox,
  ReactWidget,
  Spinner,
  Styling,
  ToolbarButton,
  ToolbarButtonComponent,
  UseSignal,
  VDomModel,
  VDomRenderer
} from '@jupyterlab/ui-components';

export * from './clipboard.js';
export * from './commandlinker.js';
export * from './commandpalette.js';
export * from './dialog.js';
export * from './domutils.js';
export * from './inputdialog.js';
export * from './kernelstatuses.js';
export * from './mainareawidget.js';
export * from './menufactory.js';
export * from './printing.js';
export * from './runningSessions.js';
export * from './sanitizer.js';
export * from './semanticCommand.js';
export * from './sessioncontext.js';
export * from './thememanager.js';
export * from './tokens.js';
export {
  ToolbarWidgetRegistry,
  createDefaultFactory,
  createToolbarFactory,
  setToolbar
} from './toolbar/index.js';
export * from './widgettracker.js';
export * from './windowresolver.js';

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
