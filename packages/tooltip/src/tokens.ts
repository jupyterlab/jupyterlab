// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Kernel } from '@jupyterlab/services';
import { Token } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';

/**
 * The tooltip manager token.
 */
export const ITooltipManager = new Token<ITooltipManager>(
  '@jupyterlab/tooltip:ITooltipManager',
  'A service for the tooltip manager for the application. Use this to allow your extension to invoke a tooltip.'
);

/**
 * A manager to register tooltips with parent widgets.
 */
export interface ITooltipManager {
  /**
   * Invoke a tooltip.
   */
  invoke(options: ITooltipManager.IOptions): void;
}

/**
 * A namespace for `ITooltipManager` interface specifications.
 */
export namespace ITooltipManager {
  /**
   * An interface for tooltip-compatible objects.
   */
  export interface IOptions {
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
    readonly kernel: Kernel.IKernelConnection;

    /**
     * The renderer the tooltip uses to render API responses.
     */
    readonly rendermime: IRenderMimeRegistry;
  }
}
