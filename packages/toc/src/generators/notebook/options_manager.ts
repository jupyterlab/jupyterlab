// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISanitizer } from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { nullTranslator, ITranslator } from '@jupyterlab/translation';
import { TableOfContentsRegistry as Registry } from '../../registry';
import { TableOfContents } from '../../toc';
import { TagsToolComponent } from './tagstool';
import { ISignal, Signal } from '@lumino/signaling';

/**
 * Interface describing constructor options.
 */
interface IOptions {
  /**
   * Boolean indicating whether items should be numbered.
   */
  numbering: boolean;

  /**
   * HTML sanitizer.
   */
  sanitizer: ISanitizer;

  /**
   * Tag tool component.
   */
  tagTool?: TagsToolComponent;

  /**
   * The application language translator.
   */
  translator?: ITranslator;
}

/**
 * Class for managing notebook ToC generator options.
 *
 * @private
 */
class OptionsManager extends Registry.IOptionsManager {
  /**
   * Returns an options manager.
   *
   * @param widget - table of contents widget
   * @param notebook - notebook tracker
   * @param options - generator options
   * @returns options manager
   */
  constructor(
    widget: TableOfContents,
    notebook: INotebookTracker,
    options: IOptions
  ) {
    super();
    this._numbering = options.numbering;
    this._widget = widget;
    this._notebook = notebook;
    this.sanitizer = options.sanitizer;
    this.storeTags = [];
    this.translator = options.translator || nullTranslator;
    this._collapseChanged = new Signal<this, Registry.ICollapseChangedArgs>(
      this
    );
  }

  /**
   * HTML sanitizer.
   */
  readonly sanitizer: ISanitizer;

  /**
   * Gets/sets the tag tool component.
   */
  set tagTool(tagTool: TagsToolComponent | null) {
    this._tagTool = tagTool;
  }

  get tagTool() {
    return this._tagTool;
  }

  /**
   * Sets notebook meta data.
   */
  set notebookMetadata(value: [string, any]) {
    if (this._notebook.currentWidget != null) {
      this._notebook.currentWidget.model!.metadata.set(value[0], value[1]);
    }
  }

  /**
   * Gets/sets ToC generator numbering.
   */
  set numbering(value: boolean) {
    this._numbering = value;
    this._widget.update();
    this.notebookMetadata = ['toc-autonumbering', this._numbering];
  }

  get numbering() {
    return this._numbering;
  }

  /**
   * Toggles whether to show code previews in the table of contents.
   */
  set showCode(value: boolean) {
    this._showCode = value;
    this.notebookMetadata = ['toc-showcode', this._showCode];
    this._widget.update();
  }

  get showCode() {
    return this._showCode;
  }

  /**
   * Toggles whether to show Markdown previews in the table of contents.
   */
  set showMarkdown(value: boolean) {
    this._showMarkdown = value;
    this.notebookMetadata = ['toc-showmarkdowntxt', this._showMarkdown];
    this._widget.update();
  }

  get showMarkdown() {
    return this._showMarkdown;
  }

  /**
   * Signal emitted when a "collapse" twist button is pressed in the ToC
   */
  get collapseChanged(): ISignal<this, Registry.ICollapseChangedArgs> {
    return this._collapseChanged;
  }

  /**
   * Toggles whether to show tags in the table of contents.
   */
  set showTags(value: boolean) {
    this._showTags = value;
    this.notebookMetadata = ['toc-showtags', this._showTags];
    this._widget.update();
  }

  get showTags() {
    return this._showTags;
  }

  /**
   * Returns a list of selected tags.
   */
  get filtered() {
    if (this.tagTool) {
      this._filtered = this.tagTool.filtered;
    } else if (this.storeTags.length > 0) {
      this._filtered = this.storeTags;
    } else {
      this._filtered = [];
    }
    return this._filtered;
  }

  /**
   * Gets/sets a pre-rendered a toolbar.
   */
  set preRenderedToolbar(value: any) {
    this._preRenderedToolbar = value;
  }

  get preRenderedToolbar() {
    return this._preRenderedToolbar;
  }

  /**
   * Updates a table of contents widget.
   */
  updateWidget() {
    this._widget.update();
  }

  /**
   * Updates a table of contents widget and
   * emits a signal in case an extension wants
   * to perform an action when the collapse button
   * is pressed.
   */
  updateAndCollapse(args: Registry.ICollapseChangedArgs) {
    this._collapseChanged.emit(args);
    this._widget.update();
  }

  /**
   * Initializes options.
   *
   * ## Notes
   *
   * -  This will **not** change notebook meta-data.
   *
   * @param numbering - boolean indicating whether to number items
   * @param showCode - boolean indicating whether to show code previews
   * @param showMarkdown - boolean indicating whether to show Markdown previews
   * @param showTags - boolean indicating whether to show tags
   */
  initializeOptions(
    numbering: boolean,
    showCode: boolean,
    showMarkdown: boolean,
    showTags: boolean
  ) {
    this._numbering = numbering;
    this._showCode = showCode;
    this._showMarkdown = showMarkdown;
    this._showTags = showTags;
    this._widget.update();
  }

  private _preRenderedToolbar: any = null;
  private _filtered: string[] = [];
  private _numbering: boolean;
  private _showCode = false;
  private _showMarkdown = false;
  private _showTags = false;
  private _notebook: INotebookTracker;
  private _widget: TableOfContents;
  private _collapseChanged: Signal<this, Registry.ICollapseChangedArgs>;
  private _tagTool: TagsToolComponent | null = null;
  translator: ITranslator; // FIXME-TRANS:
  public storeTags: string[];
}

/**
 * Exports.
 */
export { OptionsManager };
