// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';
import CodeMirror from 'codemirror';

/* tslint:disable */
/**
 * The CodeMirror token.
 */
export const ICodeMirror = new Token<ICodeMirror>(
  '@jupyterlab/codemirror:ICodeMirror'
);
/* tslint:enable */

/** The CodeMirror interface. */
export interface ICodeMirror {
  /**
   * A singleton CodeMirror module, rexported.
   */
  CodeMirror: typeof CodeMirror;

  /**
   * A function to allow extensions to ensure that
   * the vim keymap has been imported
   */
  ensureVimKeymap: () => Promise<void>;
}
