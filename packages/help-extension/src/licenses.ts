// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Panel, PanelLayout } from '@lumino/widgets';
import { ReadonlyJSONObject } from '@lumino/coreutils';
import {
  BasicKeyHandler,
  BasicMouseHandler,
  BasicSelectionModel,
  DataGrid,
  JSONModel
} from '@lumino/datagrid';

import { ServerConnection } from '@jupyterlab/services';
import { TranslationBundle } from '@jupyterlab/translation';

/**
 * A license viewer
 */
export class Licenses extends Panel {
  protected readonly model: Licenses.Model;
  constructor(options: Licenses.IOptions) {
    super();
    this.addClass('jp-Licenses');
    this.model = options.model;
    const layout = this.layout as PanelLayout;
    this._grid = new DataGrid({
      defaultSizes: {
        rowHeight: 24,
        columnWidth: 144,
        rowHeaderWidth: 64,
        columnHeaderHeight: 36
      }
    });
    this._grid.addClass('jp-Licenses-Grid');
    this._grid.headerVisibility = 'all';
    this._grid.keyHandler = new BasicKeyHandler();
    this._grid.mouseHandler = new BasicMouseHandler();
    this._grid.copyConfig = {
      separator: '\t',
      format: DataGrid.copyFormatGeneric,
      headers: 'all',
      warningThreshold: 1e6
    };

    layout.addWidget(this._grid);
    void this._updateGrid();
  }

  /**
   * Create the model for the grid.
   */
  private async _updateGrid(): Promise<void> {
    const licenses = await this.model.licenses();
    const bundle = this.model.bundle;
    const data = bundle ? licenses[bundle]?.packages : [];
    const dataModel = (this._grid.dataModel = new JSONModel({
      data,
      schema: this.model.schema
    }));
    this._grid.selectionModel = new BasicSelectionModel({ dataModel });
  }

  private _grid: DataGrid;
}

export namespace Licenses {
  /**
   * Options for instantiating a license viewer
   */
  export interface IOptions {
    model: Model;
  }
  /**
   * Options for instantiating a license model
   */
  export interface IModelOptions {
    licensesUrl: string;
    serverSettings?: ServerConnection.ISettings;
    trans: TranslationBundle;
  }

  export interface ILicenseResponse {
    [key: string]: ILicenseReport;
  }

  /**
   * A top-level report of the licenses for all code included in a bundle
   *
   * ### Note
   *
   * This is roughly informed by the terms defined in the SPDX spec, though is not
   * an SPDX Document, since there seem to be several (incompatible) specs
   * in that repo.
   *
   * @see https://github.com/spdx/spdx-spec/blob/development/v2.2.1/schemas/spdx-schema.json
   **/
  export interface ILicenseReport {
    packages: IPackageLicenseInfo[];
  }

  /**
   * A best-effort single bundled package's information.
   *
   * ### Note
   *
   * This is roughly informed by SPDX `packages` and `hasExtractedLicenseInfos`,
   * as making it conformant would vastly complicate the structure.
   *
   * @see https://github.com/spdx/spdx-spec/blob/development/v2.2.1/schemas/spdx-schema.json
   **/
  export interface IPackageLicenseInfo extends ReadonlyJSONObject {
    /** the name of the package as it appears in node_modules */
    name: string;
    /** the version of the package, or an empty string if unknown */
    versionInfo: string;
    /** an SPDX license or LicenseRef, or an empty string if unknown */
    licenseId: string;
    /** the verbatim extracted text of the license, or an empty string if unknown */
    extractedText: string;
  }

  /**
   * A model for license data
   */
  export class Model {
    constructor(options: IModelOptions) {
      this._trans = options.trans;
      this._licensesUrl = options.licensesUrl;
      this._serverSettings =
        options.serverSettings || ServerConnection.makeSettings();
      this.initSchema();
    }

    private initSchema() {
      this._schema = {
        fields: [
          { name: 'name', title: this._trans.__('Name') },
          { name: 'versionInfo', title: this._trans.__('Version') },
          { name: 'licenseId', title: this._trans.__('License ID') },
          { name: 'extractedText', title: this._trans.__('License Text') }
        ],
        primaryKey: ['name', 'versionInfo']
      };
    }

    get schema() {
      return this._schema;
    }

    get bundles(): string[] {
      if (this._licenses) {
        return Object.keys(this._licenses);
      }
      return [];
    }

    get bundle() {
      if (this._bundle) {
        return this._bundle;
      }
      if (this.bundles.length) {
        return this.bundles[0];
      }
      return null;
    }

    set bundle(bundle: string | null) {
      this._bundle = bundle;
    }

    async licenses(): Promise<ILicenseResponse> {
      if (this._licenses != null) {
        return this._licenses;
      }
      const response = await ServerConnection.makeRequest(
        this._licensesUrl,
        {},
        this._serverSettings
      );
      const licenses = (this._licenses = (await response.json()) as ILicenseResponse);
      return licenses;
    }

    private _licenses: ILicenseResponse | null;
    private _licensesUrl: string;
    private _serverSettings: ServerConnection.ISettings;
    private _bundle: string | null;
    private _trans: TranslationBundle;
    private _schema: JSONModel.Schema;
  }
}
