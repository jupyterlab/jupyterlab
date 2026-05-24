// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';
import type { DocumentRegistry } from '@jupyterlab/docregistry';
import type { ServerConnection } from '@jupyterlab/services';
import type { IDisposable } from '@lumino/disposable';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';

import type { IFileWatcherService } from './tokens';

const FILE_WATCH_URL = 'lab/api/filewatch';

/**
 * Namespace for FileWatcher types.
 */
export namespace FileWatcher {
  /**
   * Arguments emitted when a watched file changes on disk.
   */
  export interface IChangedArgs {
    /** Relative path as supplied to subscribe(). */
    path: string;
    /** 'modified' | 'deleted' | 'moved' */
    eventType: string;
  }

  /**
   * Options for constructing a FileWatcherService.
   */
  export interface IOptions {
    serverSettings: ServerConnection.ISettings;
  }
}

/**
 * A service that connects to the backend WebSocket endpoint and notifies
 * subscribers when watched files change on disk via OS-level notifications
 * (inotify on Linux, FSEvents on macOS).
 */
export class FileWatcherService implements IDisposable {
  constructor(options: FileWatcher.IOptions) {
    this._serverSettings = options.serverSettings;
    this._connect();
  }

  /**
   * Whether the service has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Whether the backend watchdog library is available.
   * False if the server sent an 'unavailable' message.
   */
  get isAvailable(): boolean {
    return this._isAvailable;
  }

  /**
   * Signal emitted when a subscribed file changes externally.
   */
  get fileChanged(): ISignal<this, FileWatcher.IChangedArgs> {
    return this._fileChanged;
  }

  /**
   * Subscribe to change events for a specific relative path.
   */
  subscribe(path: string): void {
    if (this._isDisposed || !this._isAvailable) {
      return;
    }
    this._subscriptions.add(path);
    this._sendIfOpen({ msgType: 'subscribe', path });
  }

  /**
   * Unsubscribe from change events for a specific relative path.
   */
  unsubscribe(path: string): void {
    if (this._isDisposed) {
      return;
    }
    this._subscriptions.delete(path);
    this._sendIfOpen({ msgType: 'unsubscribe', path });
  }

  /**
   * Dispose of the service and close the WebSocket.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    clearTimeout(this._reconnectTimer);
    if (this._socket) {
      this._socket.onclose = null;
      this._socket.close();
      this._socket = null;
    }
    Signal.clearData(this);
  }

  // ------------------------------------------------------------------ //
  // Private
  // ------------------------------------------------------------------ //

  private _connect(): void {
    if (this._isDisposed || !this._isAvailable) {
      return;
    }

    const { appendToken, token, WebSocket: WS, wsUrl } = this._serverSettings;
    let url = URLExt.join(wsUrl, FILE_WATCH_URL);
    if (appendToken && token !== '') {
      url += `?token=${encodeURIComponent(token)}`;
    }

    const socket = (this._socket = new WS(url));

    socket.onopen = () => {
      // Reset back-off so a future disconnect retries quickly again.
      this._reconnectDelay = 1000;
      // Replay all subscriptions after (re)connect.
      for (const path of this._subscriptions) {
        this._sendIfOpen({ msgType: 'subscribe', path });
      }
    };

    socket.onmessage = (evt: MessageEvent) => {
      this._onMessage(evt.data as string);
    };

    socket.onclose = () => {
      this._socket = null;
      if (!this._isDisposed && this._isAvailable) {
        this._scheduleReconnect();
      }
    };

    socket.onerror = () => {
      // onclose will fire after onerror; reconnect logic lives there.
    };
  }

  private _onMessage(raw: string): void {
    let msg: Record<string, string>;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg['msgType']) {
      case 'changed':
        this._fileChanged.emit({
          path: msg['path'],
          eventType: msg['eventType']
        });
        break;

      case 'unavailable':
        this._isAvailable = false;
        console.info(
          '[JupyterLab] File watch unavailable: watchdog is not installed on the server. ' +
            'Install it with: pip install watchdog'
        );
        break;

      case 'error':
        console.warn('[JupyterLab] FileWatchHandler error:', msg['message']);
        break;

      default:
        break;
    }
  }

  private _scheduleReconnect(): void {
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = window.setTimeout(() => {
      if (!this._isDisposed && this._isAvailable) {
        this._connect();
      }
    }, this._reconnectDelay);
    // Exponential back-off capped at 30 s.
    this._reconnectDelay = Math.min(this._reconnectDelay * 2, 30_000);
  }

  private _sendIfOpen(msg: Record<string, string>): void {
    if (this._socket && this._socket.readyState === WebSocket.OPEN) {
      this._socket.send(JSON.stringify(msg));
    }
  }

  private readonly _serverSettings: ServerConnection.ISettings;
  private readonly _fileChanged = new Signal<this, FileWatcher.IChangedArgs>(
    this
  );
  private _socket: WebSocket | null = null;
  private _subscriptions = new Set<string>();
  private _isAvailable = true;
  private _isDisposed = false;
  private _reconnectDelay = 1000;
  private _reconnectTimer = -1;
}

/**
 * Orchestrates the response to OS-level file change events for documents
 * that are open in the application.
 *
 * Responsibilities:
 *   - Subscribe and unsubscribe paths on the {@link IFileWatcherService}
 *     as document contexts are tracked or disposed.
 *   - Decide what to do on an external change: silent revert (clean +
 *     autoReload), inform the user (clean + !autoReload), or trigger the
 *     existing save-conflict modal (dirty).
 *   - Suppress watchdog echoes that follow a context-initiated save.
 */
export class FileWatchController implements IDisposable {
  constructor(options: FileWatchController.IOptions) {
    this._service = options.service;
    this._getSettings = options.getSettings;
    this._notifyDeleted = options.notifyDeleted;
    this._notifyChanged = options.notifyChanged;

    this._service.fileChanged.connect(this._onFileChanged, this);
  }

  /**
   * Whether the controller has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Start tracking a document context: subscribes the path on the file
   * watcher service and hooks into the context's lifecycle so that future
   * external changes drive the appropriate UI flow.
   *
   * Safe to call multiple times with the same context.
   */
  track(context: DocumentRegistry.Context): void {
    if (this._isDisposed) {
      return;
    }
    const path = context.path;
    const existing = this._contextsByPath.get(path) ?? [];
    if (existing.includes(context)) {
      return;
    }
    existing.push(context);
    this._contextsByPath.set(path, existing);
    this._service.subscribe(path);

    context.disposed.connect(this._onContextDisposed, this);
    context.saveState.connect(this._onSaveState, this);
    context.pathChanged.connect(this._onPathChanged, this);
  }

  /**
   * Dispose of the controller; unsubscribes all paths and detaches listeners.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._service.fileChanged.disconnect(this._onFileChanged, this);
    for (const [path, contexts] of this._contextsByPath) {
      this._service.unsubscribe(path);
      for (const context of contexts) {
        context.disposed.disconnect(this._onContextDisposed, this);
        context.saveState.disconnect(this._onSaveState, this);
        context.pathChanged.disconnect(this._onPathChanged, this);
      }
    }
    this._contextsByPath.clear();
    this._suppressUntil.clear();
  }

  // ------------------------------------------------------------------ //
  // Private
  // ------------------------------------------------------------------ //

  private _onFileChanged(
    _: IFileWatcherService,
    args: FileWatcher.IChangedArgs
  ): void {
    const { path, eventType } = args;
    const { watchEnabled, autoReload } = this._getSettings();
    if (!watchEnabled) {
      return;
    }
    const until = this._suppressUntil.get(path);
    if (until !== undefined) {
      if (Date.now() < until) {
        return;
      }
      this._suppressUntil.delete(path);
    }
    const contexts = this._contextsByPath.get(path) ?? [];
    for (const context of contexts) {
      if (eventType === 'deleted') {
        this._notifyDeleted(path);
        continue;
      }
      if (context.model.dirty) {
        // Open the suppression window now to absorb any multi-event burst
        // from this single external change while the conflict modal is open.
        this._suppressUntil.set(
          path,
          Date.now() + FileWatchController.SUPPRESS_WINDOW_MS
        );
        // Trigger the existing _maybeSave -> _raiseConflict flow:
        // the Cancel/Revert/Overwrite modal handles the user decision.
        // ModalCancelError / ModalDuplicateError are expected here.
        void context.save().catch(() => {
          /* user cancelled or modal already open — nothing to do */
        });
      } else if (autoReload) {
        void context.revert();
      } else {
        this._notifyChanged(path, () => void context.revert());
      }
    }
  }

  private _onContextDisposed(context: DocumentRegistry.Context): void {
    const path = context.path;
    const remaining = (this._contextsByPath.get(path) ?? []).filter(
      c => c !== context
    );
    if (remaining.length === 0) {
      this._contextsByPath.delete(path);
      this._service.unsubscribe(path);
      this._suppressUntil.delete(path);
    } else {
      this._contextsByPath.set(path, remaining);
    }
  }

  private _onPathChanged(
    context: DocumentRegistry.Context,
    newPath: string
  ): void {
    // Find the path the context was tracked under (the OLD path).
    let oldPath: string | undefined;
    for (const [path, contexts] of this._contextsByPath) {
      if (contexts.includes(context)) {
        oldPath = path;
        break;
      }
    }
    if (oldPath === undefined || oldPath === newPath) {
      return;
    }
    // Remove from the old bucket; unsubscribe if it becomes empty.
    const oldRemaining = (this._contextsByPath.get(oldPath) ?? []).filter(
      c => c !== context
    );
    if (oldRemaining.length === 0) {
      this._contextsByPath.delete(oldPath);
      this._service.unsubscribe(oldPath);
      this._suppressUntil.delete(oldPath);
    } else {
      this._contextsByPath.set(oldPath, oldRemaining);
    }
    // Add to the new bucket; subscribe if the path is fresh.
    const newBucket = this._contextsByPath.get(newPath) ?? [];
    if (!newBucket.includes(context)) {
      const fresh = newBucket.length === 0;
      newBucket.push(context);
      this._contextsByPath.set(newPath, newBucket);
      if (fresh) {
        this._service.subscribe(newPath);
      }
    }
  }

  private _onSaveState(
    context: DocumentRegistry.Context,
    state: DocumentRegistry.SaveState
  ): void {
    // revert() does not emit saveState, so a genuine external change
    // following a revert is not falsely suppressed.
    if (state === 'completed') {
      this._suppressUntil.set(
        context.path,
        Date.now() + FileWatchController.SUPPRESS_WINDOW_MS
      );
    }
  }

  private readonly _service: IFileWatcherService;
  private readonly _getSettings: () => FileWatchController.ISettings;
  private readonly _notifyDeleted: (path: string) => void;
  private readonly _notifyChanged: (path: string, reload: () => void) => void;
  private readonly _contextsByPath = new Map<
    string,
    DocumentRegistry.Context[]
  >();
  private readonly _suppressUntil = new Map<string, number>();
  private _isDisposed = false;
}

/**
 * Namespace for FileWatchController types.
 */
export namespace FileWatchController {
  /**
   * Echo-suppression window in milliseconds. Absorbs the watchdog echo
   * that follows a context-initiated save and the multi-event burst many
   * editors emit per write.
   */
  export const SUPPRESS_WINDOW_MS = 1000;

  /**
   * Plugin-provided settings snapshot, read once per event.
   */
  export interface ISettings {
    /** Master switch; if false, no reaction happens to file change events. */
    watchEnabled: boolean;
    /** If true, clean files revert silently; if false, the user is notified. */
    autoReload: boolean;
  }

  /**
   * Constructor options.
   */
  export interface IOptions {
    /** The file watcher service to listen to. */
    service: IFileWatcherService;
    /** Called on every event to retrieve the current settings. */
    getSettings(): ISettings;
    /** Display a "file was deleted on disk" notification. */
    notifyDeleted(path: string): void;
    /**
     * Display a "file changed on disk; reload?" notification. The reload
     * callback should perform the actual context.revert().
     */
    notifyChanged(path: string, reload: () => void): void;
  }
}
