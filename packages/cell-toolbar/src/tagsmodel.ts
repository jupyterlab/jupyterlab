import { VDomModel } from '@jupyterlab/apputils';
import { ICellModel } from '@jupyterlab/cells';
import { ObservableList } from '@jupyterlab/observables';

/**
 * Model handling tag lists
 *
 * stateChanged signal is emitted when the tags list or the
 * unlockedTags attributes changes.
 */
export class TagsModel extends VDomModel {
  /**
   * Constructor
   *
   * @param model Cell model
   * @param tagsList Notebook tag list
   * @param unlockedTags Whether the tags are read-only or not
   */
  constructor(
    model: ICellModel,
    tagsList: ObservableList<string>,
    unlockedTags = false
  ) {
    super();
    this._model = model;
    this._tags = tagsList;
    this._unlockedTags = unlockedTags;

    this._tags.changed.connect(this._emitStateChange, this);
  }

  /**
   * Cell model
   */
  get cellModel(): ICellModel {
    return this._model;
  }

  /**
   * Notebook tags list
   */
  get tags(): ObservableList<string> {
    return this._tags;
  }

  /**
   * @param unlockedTags Whether the tags are read-only or not
   */
  get unlockedTags(): boolean {
    return this._unlockedTags;
  }
  set unlockedTags(v: boolean) {
    if (v !== this._unlockedTags) {
      this._unlockedTags = v;
      this.stateChanged.emit();
    }
  }

  /**
   * Dispose the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._tags.changed.disconnect(this._emitStateChange, this);
    super.dispose();
  }

  private _emitStateChange(): void {
    this.stateChanged.emit();
  }

  private _model: ICellModel;
  private _tags: ObservableList<string>;
  private _unlockedTags: boolean;
}
