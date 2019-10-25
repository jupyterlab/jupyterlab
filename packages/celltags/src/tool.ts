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

  createTagInput() {
    let layout = this.layout as PanelLayout;
    let input = new AddWidget();
    input.id = 'add-tag';
    layout.insertWidget(0, input);
  }

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
    for (let j = 0; j < toAdd.length; j++) {
      if (tags.indexOf(toAdd[j]) < 0) {
        tags.push(toAdd[j]);
      }
    }
    cell.model.metadata.set('tags', tags);
    console.log(this.tracker.activeCell.model.metadata.get('tags'));
    this.refreshTags();
    this.loadActiveTags();
  }

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

  loadActiveTags() {
    let layout = this.layout as PanelLayout;
    for (let i = 0; i < layout.widgets.length; i++) {
      layout.widgets[i].update();
    }
  }

  /**
   * Pull from cell metadata all the tags assigned to notebook cells,
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
   * Get all tags once available.
   */
  protected onAfterAttach() {
    const header = document.createElement('header');
    header.textContent = 'Tags in Notebook';
    header.className = 'tag-header';
    this.parent.node.insertBefore(header, this.node);
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
  public tracker: INotebookTracker = null;
}
