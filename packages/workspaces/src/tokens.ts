// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { Token } from '@lumino/coreutils';

/**
 * The token that indicates the default file browser commands are loaded.
 */
export const IWorkspaceCommands = new Token<IWorkspaceCommands>(
  '@jupyterlab/workspaces:IWorkspaceCommands',
  'Provides identifiers of workspace commands.'
);

/**
 * The identifiers of loaded commands exposed for reuse.
 */
export interface IWorkspaceCommands {
  /**
   * Command for opening a workspace by identifier.
   */
  open: string;
}
