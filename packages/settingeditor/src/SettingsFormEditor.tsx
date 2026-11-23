/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';

import { showErrorMessage } from '@jupyterlab/apputils';
import type { ISettingRegistry, Settings } from '@jupyterlab/settingregistry';
import type { ITranslator } from '@jupyterlab/translation';
import { FormComponent } from '@jupyterlab/ui-components';
import { Button } from '@jupyterlab/ui-components';
import type {
  PartialJSONObject,
  ReadonlyJSONObject,
  ReadonlyPartialJSONObject
} from '@lumino/coreutils';
import { JSONExt } from '@lumino/coreutils';
import { Debouncer } from '@lumino/polling';
import type { IChangeEvent } from '@rjsf/core';
// The settings editor is loaded on demand and needs the validator to render.
// eslint-disable-next-line jupyter/prefer-lazy-imports
import validatorAjv8 from '@rjsf/validator-ajv8';
import type { Field, UiSchema } from '@rjsf/utils';
import type { JSONSchema7 } from 'json-schema';

import type { SettingsEditor } from './settingseditor';

/**
 * Indentation to use when saving the settings as JSON document.
 */
const JSON_INDENTATION = 4;

/**
 * Namespace for a React component that prepares the settings for a
 * given plugin to be rendered in the FormEditor.
 */
export namespace SettingsFormEditor {
  /**
   * Props passed to the SettingsFormEditor component
   */
  export interface IProps {
    /**
     * Settings object with schema and user defined values.
     */
    settings: Settings;

    /**
     * Dictionary used for custom field renderers in the form.
     */
    renderers: { [id: string]: { [property: string]: Field } };

    /**
     * Translator object
     */
    translator: ITranslator;

    /**
     * Callback to update the plugin list when a validation error occurs.
     */
    hasError: (error: boolean) => void;

    /**
     * Handler for when selection change is triggered by scrolling
     * in the SettingsPanel.
     */
    onSelect: (id: string) => void;

    /**
     * Sends whether this editor has unsaved changes to the parent class.
     */
    updateDirtyState: (dirty: boolean) => void;

    /**
     * The search result for the plugin.
     */
    filteredValues: SettingsEditor.PluginMatch;
  }

  export interface IState {
    /**
     * Indicates whether the settings have been modified. Used for hiding
     * the "Restore to Default" button when there are no changes.
     */
    isModified: boolean;

    // The following are state derived from props for memoization to avoid
    // `Form` update that results in focus lost
    // A better fix (that will break the API) would be to move this as props
    // of the component
    /**
     * Form UI schema
     */
    uiSchema: UiSchema;
    /**
     * Filtered schema
     */
    filteredSchema?: ISettingRegistry.ISchema;
    /**
     * Form context
     */
    formContext?: any;
  }
}

/**
 * A React component that prepares the settings for a
 * given plugin to be rendered in the FormEditor.
 */
export class SettingsFormEditor extends React.Component<
  SettingsFormEditor.IProps,
  SettingsFormEditor.IState
> {
  constructor(props: SettingsFormEditor.IProps) {
    super(props);
    const { settings } = props;
    settings.changed.connect(this._syncFormDataWithSettings);
    this._formData = settings.composite as ReadonlyJSONObject;

    this.state = {
      isModified: settings.isModified,
      uiSchema: this._createUiSchema(),
      filteredSchema: this._createFilteredSchema(
        Private.getMatchingFields(props.filteredValues)
      ),
      formContext: {
        defaultFormData: this.props.settings.default(),
        settings: this.props.settings,
        schema: JSONExt.deepCopy(this.props.settings.schema)
      }
    };
    this.handleChange = this.handleChange.bind(this);
    this._debouncer = new Debouncer(this._handleChange);
  }

  componentDidUpdate(prevProps: SettingsFormEditor.IProps): void {
    this._setUiSchema(prevProps.renderers[prevProps.settings.id]);
    this._setFilteredSchema(prevProps.filteredValues);

    if (prevProps.settings !== this.props.settings) {
      this._isFocused = false;
      this._needsSyncOnBlur = false;
      this._hasErrors = false;
      prevProps.settings.changed.disconnect(this._syncFormDataWithSettings);
      this.props.settings.changed.connect(this._syncFormDataWithSettings);
      this._formData = this.props.settings.composite as ReadonlyJSONObject;
      this._changeId++;
      this._lastSettledChangeId = this._changeId;
      this.setState(previousState => ({
        formContext: {
          ...previousState.formContext,
          settings: this.props.settings,
          defaultFormData: this.props.settings.default()
        }
      }));
    }
  }

  componentWillUnmount(): void {
    this.props.settings.changed.disconnect(this._syncFormDataWithSettings);
    this._debouncer.dispose();
  }

  /**
   * Handler for edits made in the form editor.
   */
  handleChange(): void {
    this._handleChange(this._formData, this._changeId);
  }

  private _applyOrDeferSettingsUpdate(): void {
    if (this._isFocused) {
      this._needsSyncOnBlur = true;
      this.setState((prevState, props) => ({
        isModified: props.settings.isModified
      }));
    } else {
      this._needsSyncOnBlur = false;
      this._formData = this.props.settings.composite as ReadonlyJSONObject;
      this.setState((prevState, props) => ({
        isModified: props.settings.isModified
      }));
    }
  }

  private _saveSettings = (
    formData: ReadonlyJSONObject,
    changeId: number
  ): Promise<void> => {
    if (changeId !== this._changeId) {
      return Promise.resolve();
    }

    // Prevent unnecessary save when opening settings that haven't been modified.
    if (
      !this.props.settings.isModified &&
      this.props.settings.isDefault(formData)
    ) {
      this._lastSettledChangeId = changeId;
      this.props.updateDirtyState(false);
      return Promise.resolve();
    }

    return this.props.settings
      .save(JSON.stringify(formData, undefined, JSON_INDENTATION))
      .then(() => {
        if (changeId !== this._changeId) {
          return;
        }
        this._lastSettledChangeId = changeId;
        this.props.updateDirtyState(false);
        this._applyOrDeferSettingsUpdate();
      })
      .catch((reason: string) => {
        if (changeId !== this._changeId) {
          return;
        }
        this._lastSettledChangeId = changeId;
        this.props.updateDirtyState(false);
        const trans = this.props.translator.load('jupyterlab');
        void showErrorMessage(trans.__('Error saving settings.'), reason);
      });
  };

  private _handleChange = (
    formData: ReadonlyJSONObject,
    changeId: number
  ): void => {
    void this._saveSettings(formData, changeId);
  };

  /**
   * Handler for the "Restore to defaults" button - clears all
   * modified settings then calls `setFormData` to restore the
   * values.
   */
  reset = async (event: React.MouseEvent): Promise<void> => {
    event.stopPropagation();
    this._isFocused = false;
    this._needsSyncOnBlur = false;
    this._hasErrors = false;
    this._changeId++;
    this._lastSettledChangeId = this._changeId;
    for (const field in this.props.settings.user) {
      await this.props.settings.remove(field);
    }
    this._formData = this.props.settings.composite as ReadonlyJSONObject;
    this.setState({ isModified: false });
  };

  private _syncFormDataWithSettings = () => {
    if (this._changeId !== this._lastSettledChangeId) {
      return;
    }
    this._applyOrDeferSettingsUpdate();
  };

  render(): JSX.Element {
    const trans = this.props.translator.load('jupyterlab');

    return (
      <div
        className="jp-SettingsFormWrapper"
        onFocus={this._onFocus}
        onBlur={this._onBlur}
        onKeyDown={this._onKeyDown}
      >
        <div className="jp-SettingsHeader">
          <h2
            className="jp-SettingsHeader-title"
            title={this.props.settings.schema.description}
          >
            {this.props.settings.schema.title}
          </h2>
          <div className="jp-SettingsHeader-buttonbar">
            {this.state.isModified && (
              <Button className="jp-RestoreButton" onClick={this.reset}>
                {trans.__('Restore to Defaults')}
              </Button>
            )}
          </div>
          <div className="jp-SettingsHeader-description">
            {this.props.settings.schema.description}
          </div>
        </div>
        <FormComponent
          validator={validatorAjv8}
          schema={this.state.filteredSchema as JSONSchema7}
          formData={this._getFilteredFormData(this.state.filteredSchema)}
          uiSchema={this.state.uiSchema}
          fields={this.props.renderers[this.props.settings.id]}
          formContext={this.state.formContext}
          liveValidate
          idPrefix={`jp-SettingsEditor-${this.props.settings.id}`}
          onChange={this._onChange}
          onFocus={this._onFormFocus}
          onBlur={this._onFormBlur}
          translator={this.props.translator}
          experimental_defaultFormStateBehavior={{
            emptyObjectFields: 'populateRequiredDefaults'
          }}
          buttonStyle="icons"
        />
      </div>
    );
  }

  private _onFocus = (): void => {
    this._isFocused = true;
  };

  private _onBlur = (event: React.FocusEvent<HTMLDivElement>): void => {
    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
      return;
    }
    this._isFocused = false;
    if (this._needsSyncOnBlur) {
      this._applyOrDeferSettingsUpdate();
    }
  };

  private _onFormFocus = (): void => {
    this._isFocused = true;
  };

  private _onFormBlur = (): void => {
    this._isFocused = false;
    if (this._needsSyncOnBlur) {
      this._applyOrDeferSettingsUpdate();
    }
  };

  private _onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) {
      return;
    }

    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      const input = event.target;
      const inputId = input.id;
      const idPrefix = `jp-SettingsEditor-${this.props.settings.id}`;

      let getNewIdToFocus: (() => string | null) | null = null;
      if (inputId.startsWith(idPrefix + '_')) {
        const suffix = inputId.slice(idPrefix.length + 1);
        const match = suffix.match(/^(.+)_(\d+)_(.+)$/);
        if (match) {
          const propName = match[1];
          const oldIndex = parseInt(match[2], 10);
          const fieldName = match[3];
          const currentArray = (this._formData as any)?.[propName];
          if (Array.isArray(currentArray) && currentArray[oldIndex]) {
            const editedItem = currentArray[oldIndex];
            getNewIdToFocus = () => {
              const compositeArray = (this.props.settings.composite as any)?.[
                propName
              ];
              if (Array.isArray(compositeArray)) {
                const newIndex = compositeArray.findIndex((item: any) => {
                  if (
                    editedItem.name !== undefined &&
                    item?.name !== undefined
                  ) {
                    return item.name === editedItem.name;
                  }
                  if (editedItem.id !== undefined && item?.id !== undefined) {
                    return item.id === editedItem.id;
                  }
                  return JSONExt.deepEqual(item, editedItem);
                });
                if (newIndex !== -1) {
                  return `${idPrefix}_${propName}_${newIndex}_${fieldName}`;
                }
              }
              return null;
            };
          }
        }
      }

      this._isFocused = false;

      const finishEnter = () => {
        this._applyOrDeferSettingsUpdate();
        window.requestAnimationFrame(() => {
          const newId = getNewIdToFocus ? getNewIdToFocus() : null;
          const el = newId ? document.getElementById(newId) : input;
          if (el instanceof HTMLElement) {
            el.focus();
            if (el instanceof HTMLInputElement) {
              el.select();
            }
          }
        });
      };

      if (this._changeId !== this._lastSettledChangeId && !this._hasErrors) {
        void this._debouncer.stop();
        void this._saveSettings(this._formData, this._changeId).then(
          finishEnter,
          finishEnter
        );
      } else {
        finishEnter();
      }
    }
  };

  private _onChange = (e: IChangeEvent<ReadonlyPartialJSONObject>): void => {
    this._hasErrors = e.errors.length !== 0;
    this.props.hasError(this._hasErrors);

    // Create a deep copy of the current form data to work with
    const updatedFormData = JSONExt.deepCopy(
      this._formData as PartialJSONObject
    );

    // Only update fields that are actually present in the filtered view
    if (e.formData) {
      // Safely iterate over the keys in e.formData
      Object.keys(e.formData).forEach(key => {
        // Use type assertion to tell TypeScript this is safe
        const formData = e.formData as PartialJSONObject;
        if (formData && key in formData) {
          updatedFormData[key] = formData[key];
        }
      });
    }

    // Convert back to ReadonlyJSONObject for this._formData
    this._formData = updatedFormData as ReadonlyJSONObject;
    const changeId = ++this._changeId;

    if (!this._hasErrors) {
      this.props.updateDirtyState(true);
      void this._debouncer.invoke(this._formData, changeId);
    }
    this.props.onSelect(this.props.settings.id);
  };

  private _setUiSchema(prevRenderers?: { [id: string]: Field }) {
    const renderers = this.props.renderers[this.props.settings.id];
    if (
      !JSONExt.deepEqual(
        Object.keys(prevRenderers ?? {}).sort(),
        Object.keys(renderers ?? {}).sort()
      )
    ) {
      this.setState({ uiSchema: this._createUiSchema() });
    }
  }

  /**
   * Create the UI schema that passes the custom renderers to the form.
   */
  private _createUiSchema(): UiSchema {
    const uiSchema: UiSchema = {};
    for (const id in this.props.renderers[this.props.settings.id]) {
      if (
        Object.keys(this.props.settings.schema.properties ?? {}).includes(id)
      ) {
        uiSchema[id] = {
          'ui:field': id
        };
      }
    }
    return uiSchema;
  }

  private _setFilteredSchema(prevFilteredValues?: SettingsEditor.PluginMatch) {
    const fields = Private.getMatchingFields(this.props.filteredValues);
    // Update the filtered value if the filter or the schema has changed.
    if (
      prevFilteredValues === undefined ||
      !JSONExt.deepEqual(
        Private.getMatchingFields(prevFilteredValues),
        fields
      ) ||
      !JSONExt.deepEqual(
        this.state.formContext.schema,
        this.props.settings.schema
      )
    ) {
      const filteredSchema = this._createFilteredSchema(fields);
      this.setState(previousState => ({
        filteredSchema,
        formContext: {
          ...previousState.formContext,
          schema: JSONExt.deepCopy(this.props.settings.schema)
        }
      }));
    }
  }

  /**
   * Create the schema with only the fields that match the search.
   */
  private _createFilteredSchema(
    fields: string[] | null
  ): ISettingRegistry.ISchema {
    const filteredSchema = JSONExt.deepCopy(this.props.settings.schema);
    if (fields !== null) {
      for (const field in filteredSchema.properties) {
        if (!fields.includes(field)) {
          delete filteredSchema.properties[field];
        }
      }
    }
    return filteredSchema;
  }

  private _getFilteredFormData(
    filteredSchema?: ISettingRegistry.ISchema
  ): ReadonlyJSONObject {
    if (!filteredSchema?.properties) {
      return this._formData;
    }

    const filteredFormData = JSONExt.deepCopy(
      this._formData as PartialJSONObject
    );
    for (const field in filteredFormData) {
      if (!filteredSchema.properties[field]) {
        delete filteredFormData[field];
      }
    }
    return filteredFormData as ReadonlyJSONObject;
  }

  private _changeId = 0;
  private _debouncer: Debouncer<void, unknown, [ReadonlyJSONObject, number]>;
  private _formData: ReadonlyJSONObject;
  private _hasErrors = false;
  private _isFocused = false;
  private _lastSettledChangeId = 0;
  private _needsSyncOnBlur = false;
}

namespace Private {
  /**
   * Get the top-level fields that match the search, or `null` to show all
   * the fields.
   */
  export function getMatchingFields(
    match: SettingsEditor.PluginMatch
  ): string[] | null {
    if (match.kind !== 'properties' || match.matches.length === 0) {
      return null;
    }
    return [...new Set(match.matches.map(property => property.path[0]))];
  }
}
