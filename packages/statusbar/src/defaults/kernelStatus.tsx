// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React from 'react';

import { IClientSession, VDomRenderer, VDomModel } from '@jupyterlab/apputils';

import { Text } from '@jupyterlab/coreutils';

import { Kernel, Session } from '@jupyterlab/services';

import { interactiveItem, TextItem } from '..';

import { JSONExt } from '@phosphor/coreutils';

/**
 * A pure functional component for rendering kernel status.
 */
function KernelStatusComponent(
  props: KernelStatusComponent.IProps
): React.ReactElement<KernelStatusComponent.IProps> {
  return (
    <TextItem
      onClick={props.handleClick}
      source={`${Text.titleCase(props.kernelName)} | ${Text.titleCase(
        props.status
      )}`}
      title={`Change kernel for ${props.activityName}`}
    />
  );
}

/**
 * A namespace for KernelStatusComponent statics.
 */
namespace KernelStatusComponent {
  /**
   * Props for the kernel status component.
   */
  export interface IProps {
    /**
     * A click handler for the kernel status component. By default
     * we have it bring up the kernel change dialog.
     */
    handleClick: () => void;

    /**
     * The name the kernel.
     */
    kernelName: string;

    /**
     * The name of the activity using the kernel.
     */
    activityName: string;

    /**
     * The status of the kernel.
     */
    status: Kernel.Status;
  }
}

/**
 * A VDomRenderer widget for displaying the status of a kernel.
 */
export class KernelStatus extends VDomRenderer<KernelStatus.Model> {
  /**
   * Construct the kernel status widget.
   */
  constructor(opts: KernelStatus.IOptions) {
    super();
    this._handleClick = opts.onClick;
    this.model = new KernelStatus.Model();
    this.addClass(interactiveItem);
  }

  /**
   * Render the kernel status item.
   */
  render() {
    if (this.model === null) {
      return null;
    } else {
      return (
        <KernelStatusComponent
          status={this.model.status}
          kernelName={this.model.kernelName}
          activityName={this.model.activityName}
          handleClick={this._handleClick}
        />
      );
    }
  }

  private _handleClick: () => void;
}

/**
 * A namespace for KernelStatus statics.
 */
export namespace KernelStatus {
  /**
   * A VDomModel for the kernel status indicator.
   */
  export class Model extends VDomModel {
    /**
     * The name of the kernel.
     */
    get kernelName() {
      return this._kernelName;
    }

    /**
     * The current status of the kernel.
     */
    get status() {
      return this._kernelStatus;
    }

    /**
     * A display name for the activity.
     */
    get activityName(): string {
      return this._activityName;
    }
    set activityName(val: string) {
      const oldVal = this._activityName;
      if (oldVal === val) {
        return;
      }
      this._activityName = val;
      this.stateChanged.emit(void 0);
    }

    /**
     * The current client session associated with the kernel status indicator.
     */
    get session(): IClientSession | null {
      return this._session;
    }
    set session(session: IClientSession | null) {
      const oldSession = this._session;
      if (oldSession !== null) {
        oldSession.statusChanged.disconnect(this._onKernelStatusChanged);
        oldSession.kernelChanged.disconnect(this._onKernelChanged);
      }

      const oldState = this._getAllState();
      this._session = session;
      if (this._session === null) {
        this._kernelStatus = 'unknown';
        this._kernelName = 'unknown';
      } else {
        this._kernelStatus = this._session.status;
        this._kernelName = this._session.kernelDisplayName.toLowerCase();

        this._session.statusChanged.connect(this._onKernelStatusChanged);
        this._session.kernelChanged.connect(this._onKernelChanged);
      }

      this._triggerChange(oldState, this._getAllState());
    }

    /**
     * React to changes to the kernel status.
     */
    private _onKernelStatusChanged = (
      _session: IClientSession,
      status: Kernel.Status
    ) => {
      this._kernelStatus = status;
      this.stateChanged.emit(void 0);
    };

    /**
     * React to changes in the kernel.
     */
    private _onKernelChanged = (
      _session: IClientSession,
      change: Session.IKernelChangedArgs
    ) => {
      const oldState = this._getAllState();
      const { newValue } = change;
      if (newValue !== null) {
        this._kernelStatus = newValue.status;
        this._kernelName = newValue.model.name.toLowerCase();
      } else {
        this._kernelStatus = 'unknown';
        this._kernelName = 'unknown';
      }

      this._triggerChange(oldState, this._getAllState());
    };

    private _getAllState(): [string, string, string] {
      return [this._kernelName, this._kernelStatus, this._activityName];
    }

    private _triggerChange(
      oldState: [string, string, string],
      newState: [string, string, string]
    ) {
      if (JSONExt.deepEqual(oldState, newState)) {
        this.stateChanged.emit(void 0);
      }
    }

    private _activityName: string = 'activity';
    private _kernelName: string = 'unknown';
    private _kernelStatus: Kernel.Status = 'unknown';
    private _session: IClientSession | null = null;
  }

  /**
   * Options for creating a KernelStatus object.
   */
  export interface IOptions {
    /**
     * A click handler for the item. By default
     * we launch a kernel selection dialog.
     */
    onClick: () => void;
  }
}
