import { AddWidget, TagWidget } from '@jupyterlab/celltags';
import { IObservableJSON, IObservableMap } from '@jupyterlab/observables';
import { toArray } from '@lumino/algorithm';
import { ReadonlyPartialJSONValue } from '@lumino/coreutils';
import { PanelLayout, Widget } from '@lumino/widgets';
import { TagsModel } from './tagsmodel';

const CELL_TAGS_CLASS = 'jp-enh-cell-tags';
const CELL_CLICKABLE_TAG_CLASS = 'jp-enh-cell-mod-click';

/**
 * A container for cell tags.
 */
export class TagTool extends Widget {
  /**
   * Construct a new tag Tool.
   */
  constructor(model: TagsModel) {
    super();
    this._model = model;
    this.layout = new PanelLayout();
    this.addClass(CELL_TAGS_CLASS);
    this._createTagInput();

    this._model.stateChanged.connect(this.onTagsModelChanged, this);

    // Update tag list
    const tags: string[] =
      (model.cellModel.metadata.get('tags') as string[]) || [];
    if (tags.length > 0) {
      model.tags.pushAll(tags); // We don't care about duplicate here so we can remove all occurrences at will
    } else {
      this.refreshTags(); // Force displaying default tags if no tags specified
    }
    model.cellModel.metadata.changed.connect(this.onCellMetadataChanged, this);
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this._model.cellModel.metadata.changed.disconnect(
      this.onCellMetadataChanged,
      this
    );
    this._model.stateChanged.disconnect(this.onTagsModelChanged, this);
    super.dispose();
  }

  /**
   * Check whether a tag is applied to the current active cell
   *
   * @param name - The name of the tag.
   *
   * @returns A boolean representing whether it is applied.
   */
  checkApplied(name: string): boolean {
    const tags = (this._model.cellModel.metadata.get('tags') as string[]) || [];

    return tags.some(tag => tag === name);
  }

  /**
   * Add a tag to the current active cell.
   *
   * @param name - The name of the tag.
   */
  addTag(name: string): void {
    if (!this._model.unlockedTags) {
      // Style toggling is applied on the widget directly => force rerendering
      this._refreshOneTag(name);
    }
    const tags = (this._model.cellModel.metadata.get('tags') as string[]) || [];
    const newTags = name
      .split(/[,\s]+/)
      .filter(tag => tag !== '' && !tags.includes(tag));
    // Update the cell metadata => tagList will be updated in metadata listener
    this._model.cellModel.metadata.set('tags', [...tags, ...newTags]);
  }

  /**
   * Remove a tag from the current active cell.
   *
   * @param name - The name of the tag.
   */
  removeTag(name: string): void {
    if (!this._model.unlockedTags) {
      // Style toggling is applied on the widget directly => force rerendering
      this._refreshOneTag(name);
      return;
    }
    // Need to copy as we splice a mutable otherwise
    const tags = [
      ...((this._model.cellModel.metadata.get('tags') as string[]) || [])
    ];
    const idx = tags.indexOf(name);
    if (idx > -1) {
      tags.splice(idx, 1);
    }

    // Update the cell metadata => tagList will be update in metadata listener
    if (tags.length === 0) {
      this._model.cellModel.metadata.delete('tags');
    } else {
      this._model.cellModel.metadata.set('tags', tags);
    }
  }

  /**
   * Update the tag widgets for the current cell.
   */
  refreshTags(): void {
    const layout = this.layout as PanelLayout;
    const tags: string[] = [...new Set(toArray(this._model.tags))];
    const allTags = [...tags].sort((a: string, b: string) => (a > b ? 1 : -1));

    // Dispose removed tags
    const toDispose = new Array<Widget>();
    layout.widgets.forEach(widget => {
      if (widget.id !== 'add-tag') {
        const idx = tags.indexOf((widget as TagWidget).name);
        if (idx < 0) {
          toDispose.push(widget);
        } else {
          tags.splice(idx, 1);
        }
      }
    });
    toDispose.forEach(widget => widget.dispose());

    // Insert new tags
    tags.forEach(tag => {
      layout.insertWidget(
        (this.layout as PanelLayout).widgets.length - 1,
        new TagWidget(tag)
      );
    });

    // Sort the widgets in tag alphabetical order
    [...layout.widgets].forEach((widget: Widget, index: number) => {
      let tagIndex = allTags.findIndex(
        tag => (widget as TagWidget).name === tag
      );
      // Handle AddTag widget case
      if (tagIndex === -1) {
        tagIndex = allTags.length;
      }
      if (tagIndex !== index) {
        layout.insertWidget(tagIndex, widget);
      }
    });

    // Update all tags widgets
    layout.widgets.forEach(widget => {
      widget.update();
      if (this._model.unlockedTags) {
        widget.show();
        widget.addClass(CELL_CLICKABLE_TAG_CLASS);
      } else {
        if (
          widget.id === 'add-tag' ||
          !this.checkApplied((widget as TagWidget).name)
        ) {
          widget.hide();
        } else {
          widget.show();
          widget.removeClass(CELL_CLICKABLE_TAG_CLASS);
        }
      }
    });
  }

  /**
   * Add an AddWidget input box to the layout.
   */
  protected _createTagInput(): void {
    const layout = this.layout as PanelLayout;
    const input = new AddWidget();
    input.id = 'add-tag';
    layout.addWidget(input);
  }

  /**
   * Force refreshing one tag widget
   *
   * @param name Tag
   */
  protected _refreshOneTag(name: string): void {
    [...(this.layout as PanelLayout).widgets]
      .find(
        widget => widget.id !== 'add-tag' && (widget as TagWidget).name === name
      )
      ?.update();
  }

  /**
   * Validate the 'tags' of cell metadata, ensuring it is a list of strings and
   * that each string doesn't include spaces.
   *
   * @param tagList Tags array to be validated
   * @returns Validated tags array
   */
  protected _validateTags(tagList: string[]): string[] {
    const results = new Set<string>();

    tagList
      .filter(tag => typeof tag === 'string' && tag !== '')
      .forEach(tag => {
        tag.split(/[,\s]+/).forEach(subTag => {
          if (subTag !== '') {
            results.add(subTag);
          }
        });
      });

    return [...results];
  }

  /**
   * Propagate the cell metadata changes to the shared tag list.
   *
   * @param metadata Cell metadata
   * @param changes Metadata changes
   */
  protected onCellMetadataChanged(
    metadata: IObservableJSON,
    changes: IObservableMap.IChangedArgs<ReadonlyPartialJSONValue | undefined>
  ): void {
    if (changes.key === 'tags') {
      const oldTags = [...new Set((changes.oldValue as string[]) || [])];
      const newTags = this._validateTags((changes.newValue as string[]) || []);

      oldTags.forEach(tag => {
        if (!newTags.includes(tag)) {
          this._model.tags.removeValue(tag);
        }
      });
      this._model.tags.pushAll(newTags.filter(tag => !oldTags.includes(tag)));
    }
  }

  /**
   * Listener on shared tag list changes
   *
   * @param list Shared tag list
   * @param changes Tag list changes
   */
  protected onTagsModelChanged(): void {
    this.refreshTags();
  }

  private _model: TagsModel;
}
