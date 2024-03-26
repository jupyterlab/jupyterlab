/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Poll } from '@lumino/polling';
import { ISignal, Signal } from '@lumino/signaling';
import { Workspace } from '@jupyterlab/services';
import { IWorkspacesModel } from './tokens';

/**
 * The default duration of the auto-refresh in ms
 */
const DEFAULT_REFRESH_INTERVAL = 10000;

/**
 * An implementation of a workspaces model.
 */
export class WorkspacesModel implements IWorkspacesModel {
  constructor(options: WorkspacesModel.IOptions) {
    this._manager = options.manager;
    const refreshInterval = options.refreshInterval || DEFAULT_REFRESH_INTERVAL;
    this._poll = new Poll({
      auto: options.auto ?? true,
      name: '@jupyterlab/workspaces:Model',
      factory: () => this._fetchList(),
      frequency: {
        interval: refreshInterval,
        backoff: true,
        max: 300 * 1000
      },
      standby: options.refreshStandby || 'when-hidden'
    });
  }

  /**
   * The list of available workspaces.
   */
  get workspaces(): Workspace.IWorkspace[] {
    return this._workspaceData.values;
  }

  /**
   * The list of workspace identifiers.
   */
  get identifiers(): string[] {
    return this._workspaceData.ids;
  }

  /**
   * Create an empty workspace.
   */
  async create(workspaceId: string): Promise<void> {
    await this._manager.save(workspaceId, {
      metadata: { id: workspaceId },
      data: {}
    });
    await this.refresh();
  }

  /**
   * A signal emitted when the workspaces list is refreshed.
   */
  get refreshed(): ISignal<WorkspacesModel, void> {
    return this._refreshed;
  }

  /**
   * Force a refresh of the workspaces list.
   */
  async refresh(): Promise<void> {
    await this._poll.refresh();
    await this._poll.tick;
  }

  /**
   * Rename a workspace.
   */
  async rename(workspaceId: string, newName: string): Promise<void> {
    const workspace = await this._manager.fetch(workspaceId);
    workspace.metadata.id = newName;

    await this._manager.save(newName, workspace);
    await this._manager.remove(workspaceId);
    await this.refresh();
  }

  /**
   * Reset a workspace.
   */
  async reset(workspaceId: string): Promise<void> {
    const workspace = await this._manager.fetch(workspaceId);
    workspace.data = {};
    await this._manager.save(workspaceId, workspace);
    await this.refresh();
  }

  /**
   * Remove a workspace.
   */
  async remove(workspaceId: string): Promise<void> {
    await this._manager.remove(workspaceId);
    await this.refresh();
  }

  /**
   * Save workspace under a different name.
   */
  async saveAs(workspaceId: string, newName: string): Promise<void> {
    const data = await this._manager.fetch(workspaceId);
    data.metadata.id = newName;
    await this._manager.save(newName, data);
    await this.refresh();
  }

  /**
   * Get whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._poll.dispose();
    Signal.clearData(this);
  }

  private async _fetchList() {
    this._workspaceData = await this._manager.list();
    this._refreshed.emit(void 0);
  }

  private _refreshed = new Signal<WorkspacesModel, void>(this);
  private _isDisposed = false;
  private _poll: Poll;
  private _manager: Workspace.IManager;
  private _workspaceData: { ids: string[]; values: Workspace.IWorkspace[] } = {
    ids: [],
    values: []
  };
}

/**
 * The namespace for the `WorkspacesModel` class statics.
 */
export namespace WorkspacesModel {
  /**
   * An options object for initializing a the workspaces model.
   */
  export interface IOptions {
    /**
     * The workspaces manager.
     */
    manager: Workspace.IManager;

    /**
     * Whether a to automatically loads initial list of workspaces.
     * The default is `true`.
     */
    auto?: boolean;

    /**
     * The time interval for browser refreshing, in ms.
     */
    refreshInterval?: number;

    /**
     * When the model stops polling the API. Defaults to `when-hidden`.
     */
    refreshStandby?: Poll.Standby | (() => boolean | Poll.Standby);
  }
}
