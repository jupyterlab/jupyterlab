// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  Token
} from '@phosphor/application';

import  {
  Widget
} from '@phosphor/widgetwidget';

import {
  CodeEditor
} from '../codeeditor';

import {
  IRenderMime
} from '../rendermime';


export * from './widget';


/**
 * The command IDs used by the tooltip plugin.
 */
export
namespace CommandIDs {
  export
  const launchConsole = 'tooltip:launch-console';

  export
  const launchNotebook = 'tooltip:launch-notebook';
};


/* tslint:disable */
/**
 * The tooltip manager token.
 */
export
const ITooltipManager = new Token<ITooltipManager>('jupyter.services.tooltip');
/* tslint:enable */


/**
 * A manager to register tooltips with parent widgets.
 */
export
interface ITooltipManager {
  /**
   * Invoke a tooltip.
   */
  invoke(options: ITooltipManager.IOptions): void;
}


/**
 * A namespace for `ICompletionManager` interface specifications.
 */
export
namespace ITooltipManager {
  /**
   * An interface for tooltip-compatible objects.
   */
  export
  interface IOptions {
    /**
     * The referent anchor the tooltip follows.
     */
    readonly anchor: Widget;

    /**
     * The referent editor for the tooltip.
     */
    readonly editor: CodeEditor.IEditor;

    /**
     * The kernel the tooltip communicates with to populate itself.
     */
    readonly kernel: Kernel.IKernel;

    /**
     * The renderer the tooltip uses to render API responses.
     */
    readonly rendermime: IRenderMime;
  }
}
