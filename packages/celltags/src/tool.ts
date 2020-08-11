import { reduce } from '@lumino/algorithm';
import { PanelLayout } from '@lumino/widgets';
import { NotebookTools, INotebookTracker } from '@jupyterlab/notebook';
import { Cell } from '@jupyterlab/cells';
import { JupyterFrontEnd } from '@jupyterlab/application';
import {
  nullTranslator,
  ITranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { TagWidget } from './widget';
import { AddWidget } from './addwidget';

/**
 * A Tool for tag operations.
 */
export class TagTool extends NotebookTools.Tool {
  /**
   * Construct a new tag Tool.
   *
   * @param tracker - The notebook tracker.
   */
  constructor(
    tracker: INotebookTracker,
    app: JupyterFrontEnd,
    translator?: ITranslator
  ) {
    super();
    app;
    this.translator = translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    this.tracker = tracker;
    this.layout = new PanelLayout();
    this.createTagInput();
  }

  /**
   * Add an AddWidget input box to the layout.
   */
  createTagInput() {
    const layout = this.layout as PanelLayout;
    const input = new AddWidget(this.translator);
    input.id = 'add-tag';
    layout.insertWidget(0, input);
  }

  /**
   * Check whether a tag is applied to the current active cell
   *
   * @param name - The name of the tag.
   *
   * @returns A boolean representing whether it is applied.
   */
  checkApplied(name: string): boolean {
    const activeCell = this.tracker?.activeCell;
    if (activeCell) {
      const tags = activeCell.model.metadata.get('tags') as string[];
      if (tags) {
        return tags.includes(name);
      }
    }
    return false;
  }

  /**
   * Add a tag to the current active cell.
   *
   * @param name - The name of the tag.
   */
  addTag(name: string) {
    const cell = this.tracker?.activeCell;
    if (cell) {
      const oldTags = (cell.model.metadata.get('tags') as string[]) || [];
      let tagsToAdd = name.split(/[,\s]+/);
      tagsToAdd = tagsToAdd.filter(tag => tag !== '' && !oldTags.includes(tag));
      cell.model.metadata.set('tags', oldTags.concat(tagsToAdd));
      this.refreshTags();
      this.loadActiveTags();
    }
  }

  /**
   * Remove a tag from the current active cell.
   *
   * @param name - The name of the tag.
   */
  removeTag(name: string) {
    const cell = this.tracker?.activeCell;
    if (cell) {
      const oldTags = cell.model.metadata.get('tags') as string[];
      let tags = oldTags.filter(tag => tag !== name);
      cell.model.metadata.set('tags', tags);
      if (tags.length === 0) {
        cell.model.metadata.delete('tags');
      }
      this.refreshTags();
      this.loadActiveTags();
    }
  }

  /**
   * Update each tag widget to represent whether it is applied to the current
   * active cell.
   */
  loadActiveTags() {
    const layout = this.layout as PanelLayout;
    for (const widget of layout.widgets) {
      widget.update();
    }
  }

  /**
   * Pull from cell metadata all the tags used in the notebook and update the
   * stored tag list.
   */
  pullTags() {
    const notebook = this.tracker?.currentWidget;
    const cells = notebook?.model?.cells || [];
    const allTags = reduce(
      cells,
      (allTags: string[], cell) => {
        const tags = (cell.metadata.get('tags') as string[]) || [];
        return [...allTags, ...tags];
      },
      []
    );
    this.tagList = [...new Set(allTags)].filter(tag => tag !== '');
  }

  /**
   * Pull the most recent list of tags and update the tag widgets - dispose if
   * the tag no longer exists, and create new widgets for new tags.
   */
  refreshTags() {
    this.pullTags();
    const layout = this.layout as PanelLayout;
    const tagWidgets = layout.widgets.filter(w => w.id !== 'add-tag');
    tagWidgets.forEach(widget => {
      if (!this.tagList.includes((widget as TagWidget).name)) {
        widget.dispose();
      }
    });
    const tagWidgetNames = tagWidgets.map(w => (w as TagWidget).name);
    this.tagList.forEach(tag => {
      if (!tagWidgetNames.includes(tag)) {
        const idx = layout.widgets.length - 1;
        layout.insertWidget(idx, new TagWidget(tag));
      }
    });
  }

  /**
   * Validate the 'tags' of cell metadata, ensuring it is a list of strings and
   * that each string doesn't include spaces.
   */
  validateTags(cell: Cell, tags: string[]) {
    tags = tags.filter(tag => typeof tag === 'string');
    tags = reduce(
      tags,
      (allTags: string[], tag) => {
        return [...allTags, ...tag.split(/[,\s]+/)];
      },
      []
    );
    const validTags = [...new Set(tags)].filter(tag => tag !== '');
    cell.model.metadata.set('tags', validTags);
    this.refreshTags();
    this.loadActiveTags();
  }

  /**
   * Handle a change to the active cell.
   */
  protected onActiveCellChanged(): void {
    this.loadActiveTags();
  }

  /**
   * Get all tags once available.
   */
  protected onAfterShow() {
    this.refreshTags();
    this.loadActiveTags();
  }

  /**
   * Upon attach, add header if it doesn't already exist and listen for changes
   * from the notebook tracker.
   */
  protected onAfterAttach() {
    if (!this.header) {
      const header = document.createElement('header');
      header.textContent = this._trans.__('Tags in Notebook');
      header.className = 'tag-header';
      this.parent!.node.insertBefore(header, this.node);
      this.header = true;
    }
    if (this.tracker.currentWidget) {
      void this.tracker.currentWidget.context.ready.then(() => {
        this.refreshTags();
        this.loadActiveTags();
      });
      this.tracker.currentWidget.model!.cells.changed.connect(() => {
        this.refreshTags();
        this.loadActiveTags();
      });
    }
    this.tracker.currentChanged.connect(() => {
      this.refreshTags();
      this.loadActiveTags();
    });
  }

  /**
   * Handle a change to active cell metadata.
   */
  protected onActiveCellMetadataChanged(): void {
    const tags = this.tracker.activeCell!.model.metadata.get('tags');
    let taglist: string[] = [];
    if (tags === undefined) {
      return;
    }
    if (typeof tags === 'string') {
      taglist.push(tags);
    } else {
      taglist = tags as string[];
    }
    this.validateTags(this.tracker.activeCell!, taglist);
  }

  public tracker: INotebookTracker;
  private tagList: string[] = [];
  private header: boolean = false;
  protected translator: ITranslator;
  private _trans: TranslationBundle;
}
