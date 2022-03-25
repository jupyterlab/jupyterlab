import { VDomModel } from '@jupyterlab/ui-components';
import { IHeading } from './tokens';

export class TableOfContentsModel extends VDomModel {
  constructor() {
    super();
    this._activeEntry = null;
    this._headings = new Array<IHeading>(0);
  }

  /**
   * Current active entry.
   *
   * @returns table of contents active entry
   */
  get activeEntry(): IHeading | null {
    return this._activeEntry;
  }

  /**
   * List of headings.
   *
   * @returns table of contents list of headings
   */
  get headings(): IHeading[] {
    return this._headings;
  }

  protected _activeEntry: IHeading | null;
  protected _headings: IHeading[];
}
