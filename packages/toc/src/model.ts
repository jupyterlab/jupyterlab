// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { VDomModel } from '@jupyterlab/ui-components';
import { JSONExt } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import { TableOfContents } from './tokens';

/**
 * Abstract table of contents model.
 */
export abstract class TableOfContentsModel<
    H extends TableOfContents.IHeading,
    T extends Widget = Widget
  >
  extends VDomModel
  implements TableOfContents.IModel<H>
{
  /**
   * Constructor
   *
   * @param widget The widget to search in
   * @param configuration Default model configuration
   */
  constructor(
    protected widget: T,
    configuration?: TableOfContents.IConfig
  ) {
    super();
    this._activeHeading = null;
    this._activeHeadingChanged = new Signal<
      TableOfContentsModel<H, T>,
      H | null
    >(this);
    this._collapseChanged = new Signal<TableOfContentsModel<H, T>, H>(this);
    this._configuration = configuration ?? { ...TableOfContents.defaultConfig };
    this._headings = new Array<H>();
    this._headingsChanged = new Signal<TableOfContentsModel<H, T>, void>(this);
    this._isActive = false;
    this._isRefreshing = false;
    this._needsRefreshing = false;
  }

  /**
   * Current active entry.
   *
   * @returns table of contents active entry
   */
  get activeHeading(): H | null {
    return this._activeHeading;
  }

  /**
   * Signal emitted when the active heading changes.
   */
  get activeHeadingChanged(): ISignal<TableOfContents.IModel<H>, H | null> {
    return this._activeHeadingChanged;
  }

  /**
   * Signal emitted when a table of content section collapse state changes.
   */
  get collapseChanged(): ISignal<TableOfContents.IModel<H>, H | null> {
    return this._collapseChanged;
  }

  /**
   * Model configuration
   */
  get configuration(): TableOfContents.IConfig {
    return this._configuration;
  }

  /**
   * Type of document supported by the model.
   *
   * #### Notes
   * A `data-document-type` attribute with this value will be set
   * on the tree view `.jp-TableOfContents-content[data-document-type="..."]`
   */
  abstract readonly documentType: string;

  /**
   * List of headings.
   *
   * @returns table of contents list of headings
   */
  get headings(): H[] {
    return this._headings;
  }

  /**
   * Signal emitted when the headings changes.
   */
  get headingsChanged(): ISignal<TableOfContents.IModel<H>, void> {
    return this._headingsChanged;
  }

  /**
   * Whether the model is active or not.
   *
   * #### Notes
   * An active model means it is displayed in the table of contents.
   * This can be used by subclass to limit updating the headings.
   */
  get isActive(): boolean {
    return this._isActive;
  }
  set isActive(v: boolean) {
    this._isActive = v;
    // Refresh on activation expect if it is always active
    //  => a ToC model is always active e.g. when displaying numbering in the document
    if (this._isActive && !this.isAlwaysActive) {
      this.refresh().catch(reason => {
        console.error('Failed to refresh ToC model.', reason);
      });
    }
  }

  /**
   * Whether the model gets updated even if the table of contents panel
   * is hidden or not.
   *
   * #### Notes
   * For example, ToC models use to add title numbering will
   * set this to true.
   */
  protected get isAlwaysActive(): boolean {
    return false;
  }

  /**
   * List of configuration options supported by the model.
   */
  get supportedOptions(): (keyof TableOfContents.IConfig)[] {
    return ['maximalDepth'];
  }

  /**
   * Document title
   */
  get title(): string | undefined {
    return this._title;
  }
  set title(v: string | undefined) {
    if (v !== this._title) {
      this._title = v;
      this.stateChanged.emit();
    }
  }

  /**
   * Abstract function that will produce the headings for a document.
   *
   * @returns The list of new headings or `null` if nothing needs to be updated.
   */
  protected abstract getHeadings(): Promise<H[] | null>;

  /**
   * Refresh the headings list.
   */
  async refresh(): Promise<void> {
    if (this._isRefreshing) {
      // Schedule a refresh if one is in progress
      this._needsRefreshing = true;
      return Promise.resolve();
    }

    this._isRefreshing = true;
    try {
      const newHeadings = await this.getHeadings();

      if (this._needsRefreshing) {
        this._needsRefreshing = false;
        this._isRefreshing = false;
        return this.refresh();
      }

      if (newHeadings && !this._areHeadingsEqual(newHeadings, this._headings)) {
        this._headings = newHeadings;
        this.stateChanged.emit();
        this._headingsChanged.emit();
      }
    } finally {
      this._isRefreshing = false;
    }
  }

  /**
   * Set a new active heading.
   *
   * @param heading The new active heading
   * @param emitSignal Whether to emit the activeHeadingChanged signal or not.
   */
  setActiveHeading(heading: H | null, emitSignal = true): void {
    if (this._activeHeading !== heading) {
      this._activeHeading = heading;
      this.stateChanged.emit();
    }

    if (emitSignal) {
      // Always emit the signal to trigger a scroll even if the value did not change
      this._activeHeadingChanged.emit(this._activeHeading);
    }
  }

  /**
   * Model configuration setter.
   *
   * @param c New configuration
   */
  setConfiguration(c: Partial<TableOfContents.IConfig>): void {
    const newConfiguration = { ...this._configuration, ...c };
    if (!JSONExt.deepEqual(this._configuration, newConfiguration)) {
      this._configuration = newConfiguration as TableOfContents.IConfig;
      this.refresh().catch(reason => {
        console.error('Failed to update the table of contents.', reason);
      });
    }
  }

  /**
   * Callback on heading collapse.
   *
   * @param options.heading The heading to change state (all headings if not provided)
   * @param options.collapsed The new collapsed status (toggle existing status if not provided)
   */
  toggleCollapse(options: { heading?: H; collapsed?: boolean }): void {
    if (options.heading) {
      options.heading.collapsed =
        options.collapsed ?? !options.heading.collapsed;
      this.stateChanged.emit();
      this._collapseChanged.emit(options.heading);
    } else {
      // Use the provided state or collapsed all except if all are collapsed
      const newState =
        options.collapsed ?? !this.headings.some(h => !(h.collapsed ?? false));
      this.headings.forEach(h => (h.collapsed = newState));
      this.stateChanged.emit();
      this._collapseChanged.emit(null);
    }
  }

  /**
   * Test if two headings are equal or not.
   *
   * @param heading1 First heading
   * @param heading2 Second heading
   * @returns Whether the headings are equal.
   */
  protected isHeadingEqual(heading1: H, heading2: H): boolean {
    return (
      heading1.level === heading2.level &&
      heading1.text === heading2.text &&
      heading1.prefix === heading2.prefix
    );
  }

  /**
   * Test if two list of headings are equal or not.
   *
   * @param headings1 First list of headings
   * @param headings2 Second list of headings
   * @returns Whether the array are equal.
   */
  private _areHeadingsEqual(headings1: H[], headings2: H[]): boolean {
    if (headings1.length === headings2.length) {
      for (let i = 0; i < headings1.length; i++) {
        if (!this.isHeadingEqual(headings1[i], headings2[i])) {
          return false;
        }
      }
      return true;
    }

    return false;
  }

  private _activeHeading: H | null;
  private _activeHeadingChanged: Signal<TableOfContentsModel<H, T>, H | null>;
  private _collapseChanged: Signal<TableOfContentsModel<H, T>, H | null>;
  private _configuration: TableOfContents.IConfig;
  private _headings: H[];
  private _headingsChanged: Signal<TableOfContentsModel<H, T>, void>;
  private _isActive: boolean;
  private _isRefreshing: boolean;
  private _needsRefreshing: boolean;
  private _title?: string;
}
