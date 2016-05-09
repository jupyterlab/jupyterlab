


export
class Context implements IDocumentContext {

  constructor(path: string, manager: ContextManager) {
    this._path = path;
    this._manager = manager;
  }

  /**
   * A signal emitted when the kernel changes.
   */
  get kernelChanged(): ISignal<IDocumentContext, IKernel> {
    return Private.kernelChangedSignal.bind(this);
  }

  /**
   * A signal emitted when the path changes.
   */
  get pathChanged(): ISignal<IDocumentContext, string> {
    return Private.pathChangedSignal.bind(this);
  }

  /**
   * A signal emitted when the model is saved or reverted.
   */
  get dirtyCleared(): ISignal<IDocumentContext, void> {
    return Private.dirtyClearedSignal.bind(this);
  }

  /**
   * The current kernel associated with the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  get kernel(): IKernel {
    return this._session.kernel;
  }

  /**
   * The current path associated with the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  get path(): string {
    return this._path;
  }

  /**
   * Get the current kernelspec information.
   */
  getKernelSpecs(): IKernelSpecIds {
    return this._contextManager.getKernelSpecs();
  }

  /**
   * Change the current kernel associated with the document.
   */
  changeKernel(options: IKernelId): Promise<IKernel> {
    if (!this._session) {
      return this._contextManager.startNewSession(options).then(session => {
        this._session = session;
        session.kernelChanged.connect((session, kernel) => {
          this.kernelChanged.emit(kernel);
        });
        session.pathChanged.connect((session, path) => {
          this._path = path;
          this.pathChanged.emit(path);
        });
        return session.kernel;
      });
    }
    return this._session.changeKernel(options);
  }

  /**
   * Save the document contents to disk.
   */
  save(): Promise<void> {
    return this._contextManager.save(this._path).then(() => {
      this.dirtyCleared.emit(void 0);
    });
  }

  /**
   * Revert the document contents to disk contents.
   */
  revert(): Promise<void> {
    return this._contextManager.revert(this._path).then(() => {
      this.dirtyCleared.emit(void 0);
    });
  }

  /**
   * Get the list of running sessions.
   */
  listSessions(): Promise<ISessionInfo[]> {
    return this._contextManager.listSessions();
  }

  /**
   * Add a sibling widget to the document manager.
   *
   * @param widget - The widget to add to the document manager.
   *
   * @returns A disposable used to remove the sibling if desired.
   *
   * #### Notes
   * It is assumed that the widget has the same model and context
   * as the original widget.
   */
  addSibling(widget: Widget): IDisposable {
    return this._contextManager.addSibling(this._path, widget);
  }

  private _session: INotebookSession = null;
  private _path: string;
  private _model: IDocumentModel = null;
  private _contextManager = null;
}



/**
 * A namespace for module private data.
 */
namespace Private {

  /**
   * A signal emitted when the kernel changes.
   */
  export
  const kernelChangedSignal = new Signal<IDocumentContext, IKernel>();

  /**
   * A signal emitted when the path changes.
   */
  export
  const pathChangedSignal = new Signal<IDocumentContext, string>();

  /**
   * A signal emitted when the model is saved or reverted.
   */
  export
  const dirtyClearedSignal = new Signal<IDocumentContext, void>();

}



export
class ContextManager {



}
