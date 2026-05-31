// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';

import { DebuggerDisplayRegistry } from '../../displayregistry';
import type { IDebugger, IDebuggerDisplayRegistry } from '../../tokens';
import type { INotebookTracker } from '@jupyterlab/notebook';
import type { IConsoleTracker } from '@jupyterlab/console';
/**
 * A model for a callstack.
 */
export class CallstackModel implements IDebugger.Model.ICallstack {
  constructor(options: { displayRegistry?: IDebuggerDisplayRegistry }) {
    this._displayRegistry =
      options.displayRegistry ?? new DebuggerDisplayRegistry();
  }

  /**
   * Get all the frames.
   */

  get frames(): IDebugger.IStackFrame[] {
    return this._state;
  }

  /**
   * Set the frames.
   */
  set frames(newFrames: IDebugger.IStackFrame[]) {
    this._state = newFrames;
    const currentFrameId =
      this.frame !== null ? Private.getFrameId(this.frame) : '';
    const frame = newFrames.find(
      frame => Private.getFrameId(frame) === currentFrameId
    );
    // Default to the first frame if the previous one can't be found.
    // Otherwise keep the current frame selected.
    if (!frame) {
      this.frame = newFrames[0];
    }
    this._framesChanged.emit(newFrames);
  }

  /**
   * Get the current frame.
   */
  get frame(): IDebugger.IStackFrame | null {
    return this._currentFrame;
  }

  /**
   * Set the current frame.
   */
  set frame(frame: IDebugger.IStackFrame | null) {
    this._currentFrame = frame;
    this._currentFrameChanged.emit(frame);
  }

  /**
   * Signal emitted when the frames have changed.
   */
  get framesChanged(): ISignal<this, IDebugger.IStackFrame[]> {
    return this._framesChanged;
  }

  /**
   * Signal emitted when the current frame has changed.
   */
  get currentFrameChanged(): ISignal<this, IDebugger.IStackFrame | null> {
    return this._currentFrameChanged;
  }

  /**
   * Returns a human-readable display for a frame.
   */
  getDisplayName(frame: IDebugger.IStackFrame): string {
    let name = this._displayRegistry.getDisplayName(
      frame.source as IDebugger.Source
    );
    if (frame.line !== undefined) {
      name += `:${frame.line}`;
    }
    return name;
  }

  private _state: IDebugger.IStackFrame[] = [];
  private _currentFrame: IDebugger.IStackFrame | null = null;
  private _framesChanged = new Signal<this, IDebugger.IStackFrame[]>(this);
  private _currentFrameChanged = new Signal<this, IDebugger.IStackFrame | null>(
    this
  );
  private _displayRegistry: IDebuggerDisplayRegistry;
}

/**
 * A namespace for CallstackModel
 */
export namespace CallstackModel {
  /**
   * Instantiation options for CallstackModel
   */
  export interface IOptions {
    /**
     * Debugger configuration.
     */
    config: IDebugger.IConfig;

    /**
     * The notebook tracker.
     */
    notebookTracker: INotebookTracker | null;

    /**
     * The console tracker.
     */
    consoleTracker: IConsoleTracker | null;
  }
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Construct an id for the given frame.
   *
   * @param frame The frame.
   */
  export function getFrameId(frame: IDebugger.IStackFrame): string {
    return `${frame?.source?.path}-${frame?.id}`;
  }
}
