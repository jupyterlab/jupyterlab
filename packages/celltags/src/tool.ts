import { PanelLayout } from '@phosphor/widgets';

import { NotebookTools, INotebookTracker } from '@jupyterlab/notebook';

import { Cell } from '@jupyterlab/cells';

import { JupyterFrontEnd } from '@jupyterlab/application';

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
  constructor(tracker: INotebookTracker, app: JupyterFrontEnd) {
    super();
    app;
    this.tracker = tracker;
    this.layout = new PanelLayout();
    this.createTagInput();
  }

  /**
   * Add an AddWidget input box to the layout.
   */
  createTagInput() {
    let layout = this.layout as PanelLayout;
    let input = new AddWidget();
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
    if (this.tracker.activeCell) {
      let tags = this.tracker.activeCell.model.metadata.get('tags') as string[];
      if (tags) {
        for (let i = 0; i < tags.length; i++) {
          if (tags[i] === name) {
            return true;
          }
        }
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
    let cell = this.tracker.activeCell;
    let tags = cell.model.metadata.get('tags') as string[];
    let newTags = name.split(/[,\s]+/);
    if (tags === undefined) {
      tags = [];
    }
    const toAdd: string[] = [];
    for (let i = 0; i < newTags.length; i++) {
      if (newTags[i] !== '' && toAdd.indexOf(newTags[i]) < 0) {
        toAdd.push(newTags[i]);
      }
    }
    // todo: can this be combined into one for loop?
    for (let j = 0; j < toAdd.length; j++) {
      if (tags.indexOf(toAdd[j]) < 0) {
        tags.push(toAdd[j]);
      }
    }
    cell.model.metadata.set('tags', tags);
    this.refreshTags();
    this.loadActiveTags();
    console.log(this.tracker.activeCell.model.metadata.get('tags'));
  }

  /**
   * Remove a tag from the current active cell.
   *
   * @param name - The name of the tag.
   */
  removeTag(name: string) {
    let cell = this.tracker.activeCell;
    let tags = cell.model.metadata.get('tags') as string[];
    let idx = tags.indexOf(name);
    if (idx > -1) {
      tags.splice(idx, 1);
    }
    cell.model.metadata.set('tags', tags);
    if (tags.length === 0) {
      cell.model.metadata.delete('tags');
    }
    this.refreshTags();
    this.loadActiveTags();
    console.log(this.tracker.activeCell.model.metadata.get('tags'));
  }

  /**
   * Update each tag widget to represent whether it is applied to the current
   * active cell.
   */
  loadActiveTags() {
    let layout = this.layout as PanelLayout;
    for (let i = 0; i < layout.widgets.length; i++) {
      layout.widgets[i].update();
    }
  }

  /**
   * Pull from cell metadata all the tags used in the notebook and update the
   * stored tag list.
   */
  pullTags() {
    let notebook = this.tracker.currentWidget;
    if (this.tracker && this.tracker.currentWidget) {
      let cells = notebook.model.cells;
      let allTags: string[] = [];
      for (var i = 0; i < cells.length; i++) {
        let metadata = cells.get(i).metadata;
        let tags = metadata.get('tags') as string[];
        if (tags) {
          for (var j = 0; j < tags.length; j++) {
            let name = tags[j] as string;
            if (name !== '') {
              if (allTags.indexOf(name) < 0) {
                allTags.push(name);
              }
            }
          }
        }
      }
      this.tagList = allTags;
    }
  }

  /**
   * Pull the most recent list of tags and update the tag widgets - dispose if
   * the tag no longer exists, and create new widgets for new tags.
   */
  refreshTags() {
    this.pullTags();
    let layout = this.layout as PanelLayout;
    let tags: string[] = this.tagList;
    let nWidgets = layout.widgets.length;
    for (let i = 0; i < nWidgets - 1; i++) {
      let idx = tags.indexOf((layout.widgets[i] as TagWidget).name);
      if (idx < 0 && layout.widgets[i].id != 'add-tag') {
        layout.widgets[i].dispose();
      } else {
        tags.splice(idx, 1);
      }
    }
    for (let i = 0; i < tags.length; i++) {
      let widget = new TagWidget(tags[i]);
      let idx = layout.widgets.length - 1;
      layout.insertWidget(idx, widget);
    }
  }

  /**
   * Validate the 'tags' of cell metadata, ensuring it is a list of strings and
   * that each string doesn't include spaces.
   */
  validateTags(cell: Cell) {
    let tags = cell.model.metadata.get('tags');
    var results: string[] = [];
    var taglist: string[] = [];
    if (tags === undefined) {
      return;
    }
    if (typeof tags === 'string') {
      taglist.push(tags);
    } else {
      taglist = <string[]>tags;
    }
    for (let i = 0; i < taglist.length; i++) {
      if (taglist[i] != '' && typeof taglist[i] === 'string') {
        let spl = taglist[i].split(' ');
        for (let j = 0; j < spl.length; j++) {
          if (spl[j] != '' && results.indexOf(spl[j]) < 0) {
            results.push(spl[j]);
          }
        }
      }
    }
    cell.model.metadata.set('tags', results);
  }

  /**
   * Handle a change to the active cell.
   */
  protected onActiveCellChanged(): void {
    this.loadActiveTags();
  }

  /**
   * Handle a change to cell selection in the notebook.
   */
  protected onSelectionChanged(): void {}

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
      header.textContent = 'Tags in Notebook';
      header.className = 'tag-header';
      this.parent.node.insertBefore(header, this.node);
      this.header = true;
    }
    this.tracker.currentWidget.context.ready.then(() => {
      this.refreshTags();
      this.loadActiveTags();
    });
    this.tracker.currentChanged.connect(() => {
      this.refreshTags();
      this.loadActiveTags();
    });
    this.tracker.currentWidget.model.cells.changed.connect(() => {
      this.refreshTags();
      this.loadActiveTags();
    });
  }

  /**
   * Handle a change to active cell metadata.
   */
  protected onActiveCellMetadataChanged(): void {
    this.validateTags(this.tracker.activeCell);
    this.refreshTags();
    this.loadActiveTags();
  }

  private tagList: string[] = [];
  private header: boolean = false;
  public tracker: INotebookTracker = null;
}
