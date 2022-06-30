// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module metadataform-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  INotebookTools,
  INotebookTracker,
  NotebookTools
} from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  JSONExt,
  PartialJSONArray,
  PartialJSONValue,
  ReadonlyPartialJSONObject
} from '@lumino/coreutils';
import { Message } from '@lumino/messaging';
import { ReactWidget } from '@jupyterlab/ui-components';
import { SingletonLayout, Widget } from '@lumino/widgets';
import Form, { IChangeEvent } from '@rjsf/core';
import { JSONSchema7 } from 'json-schema';
import React from 'react';
import { IMetadataForm, IMetadataFormProvider } from './token';

export { IMetadataForm, IMetadataFormProvider };

const PLUGIN_ID = '@jupyterlab/metadataform-extension:metadataforms';

/**
 * A class that create a metadata form widget
 */
export class MetadataFormWidget extends NotebookTools.Tool {
  /**
   * Construct an empty widget.
   */
  constructor(
    metadataKey: string,
    pluginId?: string,
    translator?: ITranslator
  ) {
    super();
    this.metadataKey = metadataKey;
    this._pluginId = pluginId;
    this.translator = translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    this._updatingMetadata = false;
    const layout = (this.layout = new SingletonLayout());

    const node = document.createElement('div');
    const content = document.createElement('div');
    content.textContent = this._trans.__('No metadata.');
    content.className = 'jp-MetadataForm-placeholderContent';
    node.appendChild(content);
    this._placeholder = new Widget({ node });
    this._placeholder.addClass('jp-MetadataForm-placeholder');
    layout.widget = this._placeholder;
  }

  /**
   * Set the content of the widget.
   */
  protected setContent(content: Widget | null): void {
    const layout = this.layout as SingletonLayout;
    if (layout.widget) {
      layout.widget.removeClass('jp-MetadataForm-content');
      layout.removeWidget(layout.widget);
    }
    if (!content) {
      content = this._placeholder;
    }
    content.addClass('jp-MetadataForm-content');
    layout.widget = content;
  }

  /**
   * Build widget
   */
  buildWidget(
    formSchema: ReadonlyPartialJSONObject,
    formData?: ReadonlyPartialJSONObject
  ): void {
    this.formSchema = formSchema;

    const form = (
      <Form
        schema={this.formSchema as JSONSchema7}
        formData={formData}
        idPrefix={`jp-MetadataForm-${this._pluginId}`}
        onChange={(e: IChangeEvent<ReadonlyPartialJSONObject>) => {
          this.updateMetadata(e.formData);
        }}
      />
    );
    const widget = ReactWidget.create(form);
    Widget.attach(widget, document.body);
    widget.addClass('jp-MetadataForm');
    this.setContent(widget);
  }

  /**
   * Handle a change to the active cell.
   */
  protected onActiveCellChanged(msg: Message): void {
    this._update();
  }

  /**
   * Handle a change to the active cell metadata.
   */
  protected onActiveCellMetadataChanged(msg: Message): void {
    if (!this._updatingMetadata) this._update();
  }

  /**
   * Update the form with current cell metadata.
   */
  private _update(): void {
    const cell = this.notebookTools.activeCell;
    if (cell == undefined) return;
    const currentCellMetadata = cell.model.metadata.get(this.metadataKey);
    if (currentCellMetadata != undefined) {
      this.buildWidget(
        this.formSchema,
        currentCellMetadata as ReadonlyPartialJSONObject
      );
    } else this.buildWidget(this.formSchema);
  }

  /**
   * Update the metadata of the current cell.
   * @param formData: the cell metadata set in the form.
   */
  public updateMetadata(formData: ReadonlyPartialJSONObject) {
    if (this.notebookTools == undefined) {
      console.log('NO notebook tool');
      return;
    }
    const cell = this.notebookTools.activeCell;
    if (cell == undefined) {
      console.log('NO CELL');
      return;
    }
    this._updatingMetadata = true;
    cell.model.metadata.set(this.metadataKey, formData);
    this._updatingMetadata = false;
  }

  public tracker: INotebookTracker;
  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private metadataKey: string;
  private _placeholder: Widget;
  private formSchema: ReadonlyPartialJSONObject;
  private _updatingMetadata: boolean;
  private _pluginId: PartialJSONValue | undefined;
}

namespace Private {
  export async function loadSettingsMetadataForm(
    app: JupyterFrontEnd,
    tools: MetadataFormWidget[],
    registry: ISettingRegistry,
    notebookTools: INotebookTools,
    translator: ITranslator
  ): Promise<void> {
    let canonical: ISettingRegistry.ISchema | null;
    let loaded: { [name: string]: ISettingRegistry.IMetadataForm[] } = {};

    /**
     * Populate the plugin's schema defaults.
     */
    function populate(schema: ISettingRegistry.ISchema) {
      loaded = {};
      schema.properties!.metadataforms.default = Object.keys(registry.plugins)
        .map(plugin => {
          const metadataforms =
            registry.plugins[plugin]!.schema['jupyter.lab.metadataforms'] ?? [];

          metadataforms.forEach(metadataform => {
            metadataform._origin = plugin;
          });
          loaded[plugin] = metadataforms;
          return metadataforms;
        })
        .concat([schema['jupyter.lab.metadataforms'] as any[]])
        .reduce((acc, val) => {
          return acc.concat(val);
        }, []); // flatten one level;
    }

    // Transform the plugin object to return different schema than the default.
    registry.transform(PLUGIN_ID, {
      compose: plugin => {
        // Only override the canonical schema the first time.
        if (!canonical) {
          canonical = JSONExt.deepCopy(plugin.schema);
          populate(canonical);
        }

        const defaults =
          (canonical.properties?.metadataforms?.default as PartialJSONArray) ??
          [];

        const user = {
          metadataforms: plugin.data.user.metadataforms ?? []
        };
        const composite = {
          metadataforms: defaults.concat(user.metadataforms)
        };

        plugin.data = { composite, user };
        return plugin;
      },
      fetch: plugin => {
        // Only override the canonical schema the first time.
        if (!canonical) {
          canonical = JSONExt.deepCopy(plugin.schema);
          populate(canonical);
        }

        return {
          data: plugin.data,
          id: plugin.id,
          raw: plugin.raw,
          schema: canonical,
          version: plugin.version
        };
      }
    });

    // Repopulate the canonical variable after the setting registry has
    // preloaded all initial plugins.
    canonical = null;

    const settings = await registry.load(PLUGIN_ID);

    // Create menu for non-disabled element
    for (let schema of settings.composite
      .metadataforms as ISettingRegistry.IMetadataForm[]) {
      console.log(schema);
      const tool = new MetadataFormWidget(
        schema.mainKey,
        schema._origin,
        translator
      );

      notebookTools.addSection({
        sectionName: schema.mainKey,
        rank: schema.rank,
        label: schema.label ?? schema.mainKey
      });

      if (schema.subKeys != undefined) {
        tool.buildWidget(schema.subKeys);
      }

      notebookTools.addItem({ section: schema.mainKey, tool: tool });

      tools.push(tool);
    }
  }
}
/**
 * The metadata form plugin.
 */
const metadataForm: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  autoStart: true,
  requires: [INotebookTools, ITranslator],
  optional: [ISettingRegistry],
  provides: IMetadataFormProvider,
  activate: async (
    app: JupyterFrontEnd,
    notebookTools: INotebookTools,
    translator: ITranslator,
    settings: ISettingRegistry | null
  ) => {
    console.log('Activating Metadata form');
    let tools: MetadataFormWidget[] = [];

    if (settings) {
      await Private.loadSettingsMetadataForm(
        app,
        tools,
        settings,
        notebookTools,
        translator
      );
    }

    console.log('Metadata form activated');
  }
};

export default metadataForm;
