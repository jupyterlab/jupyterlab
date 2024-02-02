// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { Token } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal } from '@lumino/signaling';
import type { Workspace } from '@jupyterlab/services';

/**
 * The token that provides the identifiers of workspace commands for reuse.
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
  /**
   * Command for deleting a workspace.
   */
  deleteWorkspace: string;
}

/**
 * The token that provides the identifiers of workspace commands for reuse.
 */
export const IWorkspacesModel = new Token<IWorkspacesModel>(
  '@jupyterlab/workspaces:IWorkspacesModel',
  'Provides a model for available workspaces.'
);

/**
 * The model for listing available workspaces.
 */
export interface IWorkspacesModel extends IDisposable {
  /**
   * The list of available workspaces.
   */
  readonly workspaces: Workspace.IWorkspace[];

  /**
   * The list of workspace identifiers.
   */
  readonly identifiers: string[];

  /**
   * Create an empty workspace.
   */
  create(workspaceId: string): Promise<void>;

  /**
   * Rename a workspace.
   */
  rename(workspaceId: string, newName: string): Promise<void>;

  /**
   * Refresh the listing of workspaces.
   */
  refresh(): Promise<void>;

  /**
   * Signal emitted when the listing is refreshed.
   */
  refreshed: ISignal<IWorkspacesModel, void>;

  /**
   * Reset a workspace.
   */
  reset(workspaceId: string): Promise<void>;

  /**
   * Remove a workspace.
   */
  remove(workspaceId: string): Promise<void>;

  /**
   * Save workspace under a different name.
   */
  saveAs(workspaceId: string, newName: string): Promise<void>;
}
