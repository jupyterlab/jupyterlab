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

/**
 * Abstract table of contents model factory for IDocumentWidget.
 */
export abstract class TableOfContentsFactory<
  W extends IDocumentWidget,
  H extends TableOfContents.IHeading = TableOfContents.IHeading
> implements TableOfContents.IFactory<W, H>
{
  /**
   * Constructor
   *
   * @param tracker Widget tracker
   */
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
   * @param configuration - Table of contents configuration
   * @returns The table of contents model
   */
  createNew(
    widget: W,
    configuration?: TableOfContents.IConfig
  ): TableOfContentsModel<H, W> {
    const model = this._createNew(widget, configuration);

    const context = widget.context;

    const updateHeadings = () => {
      model.refresh().catch(reason => {
        console.error('Failed to update the table of contents.', reason);
      });
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

  /**
   * Abstract table of contents model instantiation to allow
   * override by real implementation to customize it. The public
   * `createNew` contains the signal connections standards for IDocumentWidget
   * when the model has been instantiated.
   *
   * @param widget
   * @param configuration
   */
  protected abstract _createNew(
    widget: W,
    configuration?: TableOfContents.IConfig
  ): TableOfContentsModel<H, W>;
}
