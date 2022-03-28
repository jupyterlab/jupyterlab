// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker } from '@jupyterlab/apputils';
import { ActivityMonitor, PathExt } from '@jupyterlab/coreutils';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { Widget } from '@lumino/widgets';
import { TableOfContentsModel } from './model';
import { TableOfContents } from './tokens';

/**
 * Timeout for throttling ToC rendering following model changes.
 *
 * @private
 */
const RENDER_TIMEOUT = 1000;

export abstract class TableOfContentsFactory<W extends IDocumentWidget>
  implements TableOfContents.IFactory<W> {
  constructor(protected tracker: IWidgetTracker<W>) {}

  /**
   * Whether the factory can handle the widget or not.
   *
   * @param widget - widget
   * @returns boolean indicating a ToC can be generated
   */
  isApplicable(widget: Widget): boolean {
    if (!this.tracker.has(widget)) {
      return false;
    }

    return true;
  }

  /**
   * Create a new table of contents model for the widget
   *
   * @param widget - widget
   * @returns The table of contens model
   */
  createNew(widget: W): TableOfContentsModel<TableOfContents.IHeading, W> {
    const model = this._createNew(widget);

    const context = widget.context;

    const updateHeadings = () => {
      model.refresh();
    };
    const monitor = new ActivityMonitor({
      signal: context.model.contentChanged,
      timeout: RENDER_TIMEOUT
    });
    monitor.activityStopped.connect(updateHeadings);

    const updateTitle = () => {
      model.title = PathExt.basename(context.localPath);
    };
    context.pathChanged.connect(updateTitle);

    context.ready
      .then(() => {
        updateTitle();
        updateHeadings();
      })
      .catch(reason => {
        console.error(`Failed to initiate headings for ${context.localPath}.`);
      });

    widget.disposed.connect(() => {
      monitor.activityStopped.disconnect(updateHeadings);
      context.pathChanged.disconnect(updateTitle);
    });

    return model;
  }

  protected abstract _createNew(
    widget: W
  ): TableOfContentsModel<TableOfContents.IHeading, W>;
}
