// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { VDomModel } from '@jupyterlab/ui-components';
import { JSONExt } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';
import { TableOfContents } from './tokens';

export abstract class TableOfContentsModel<
    H extends TableOfContents.IHeading,
    T extends Widget = Widget
  >
  extends VDomModel
  implements TableOfContents.IModel<H> {
  /**
   * Constructor
   *
   * @param widget The widget to search in
   */
  constructor(protected widget: T, configuration?: TableOfContents.IConfig) {
    super();
    this._isActive = false;
    this._activeHeading = null;
    this._configuration = configuration ?? { ...TableOfContents.defaultConfig };
    this._headings = new Array<H>();
  }

  /**
   * Current active entry.
   *
   * @returns table of contents active entry
   */
  get activeHeading(): H | null {
    return this._activeHeading;
  }
  set activeHeading(heading: H | null) {
    this._activeHeading = heading;
  }

  get configuration(): TableOfContents.IConfig {
    return this._configuration;
  }
  set configuration(c: TableOfContents.IConfig) {
    if (!JSONExt.deepEqual(this._configuration, c)) {
      this._configuration = c;
      this.stateChanged.emit();
    }
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
    // Refresh on activation
    if (this._isActive) {
      this.refresh();
    }
  }

  /**
   * List of headings.
   *
   * @returns table of contents list of headings
   */
  get headings(): H[] {
    return this._headings;
  }

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
   * Boolean indicating whether a document uses LaTeX typesetting.
   */
  get usesLatex(): boolean {
    return false;
  }

  protected abstract getHeadings(): H[] | null;

  refresh(): void {
    const newHeadings = this.getHeadings();
    if (newHeadings && !Private.areHeadingsEqual(newHeadings, this._headings)) {
      this._headings = newHeadings;
      this.stateChanged.emit();
    }
  }

  toggleCollapse(heading: H): void {
    heading.collapsed = !heading.collapsed;
    this.stateChanged.emit();
  }

  private _activeHeading: H | null;
  private _configuration: TableOfContents.IConfig;
  private _headings: H[];
  private _isActive: boolean;
  private _title?: string;
}

namespace Private {
  export function areHeadingsEqual(
    headings1: TableOfContents.IHeading[],
    headings2: TableOfContents.IHeading[]
  ): boolean {
    if (headings1.length === headings2.length) {
      for (let i = 0; i < headings1.length; i++) {
        if (
          headings1[i].level !== headings2[i].level ||
          headings1[i].text !== headings2[i].text
        ) {
          break;
        }
      }
      return true;
    }

    return false;
  }
}
