// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  Token
} from '@phosphor/application';

import {
  Widget
} from '@phosphor/widgets';

import {
  CodeEditor
} from '../codeeditor';


export * from './handler';
export * from './model';
export * from './widget';


/**
 * The command IDs used by the completer plugin.
 */
export
namespace CommandIDs {
  export
  const invoke: string = 'completer:invoke';

  export
  const invokeConsole: string = 'completer:invoke-console';

  export
  const invokeNotebook: string = 'completer:invoke-notebook';

  export
  const select: string = 'completer:select';

  export
  const selectConsole: string = 'completer:select-console';

  export
  const selectNotebook: string = 'completer:select-notebook';
}



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
     * The referent anchor the completer follows.
     */
    readonly anchor: Widget;

    /**
     * The parent of the completer; the completer resources dispose with parent.
     */
    readonly parent: Widget;
  }
}
