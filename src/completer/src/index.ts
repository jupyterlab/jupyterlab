// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  Token
} from '@phosphor/coreutils';

import {
  Widget
} from '@phosphor/widgets';

import {
  CodeEditor
} from '@jupyterlab/codeeditor';


export * from './handler';
export * from './model';
export * from './widget';



/* tslint:disable */
/**
 * The completion manager token.
 */
export
const ICompletionManager = new Token<ICompletionManager>('jupyter.services.completer');
/* tslint:enable */


/**
 * A manager to register completers with parent widgets.
 */
export
interface ICompletionManager {
  /**
   * Register a completable object with the completion manager.
   *
   * @returns A completable object whose attributes can be updated as necessary.
   */
  register(completable: ICompletionManager.ICompletable): ICompletionManager.ICompletableAttributes;
}


/**
 * A namespace for `ICompletionManager` interface specifications.
 */
export
namespace ICompletionManager {
  /**
   * The attributes of a completable object that can change and sync at runtime.
   */
  export
  interface ICompletableAttributes {
    /**
     * The host editor for the completer.
     */
    editor: CodeEditor.IEditor;

    /**
     * The kernel used by the completer to make API requests.
     */
    kernel: Kernel.IKernel;
  }

  /**
   * An interface for completer-compatible objects.
   */
  export
  interface ICompletable extends ICompletableAttributes {
    /**
     * The parent of the completer; the completer resources dispose with parent.
     */
    readonly parent: Widget;
  }
}
