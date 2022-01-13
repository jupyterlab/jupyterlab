/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Settings } from '@jupyterlab/settingregistry';
import { showDialog } from '@jupyterlab/apputils';
import React from 'react';
import Form, {
  ArrayFieldTemplateProps,
  Field,
  FieldTemplateProps,
  IChangeEvent,
  UiSchema
} from '@rjsf/core';
import { JSONSchema7 } from 'json-schema';
import { JSONExt, ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { reduce } from '@lumino/algorithm';
import { PluginList } from './pluginlist';
import { ISignal } from '@lumino/signaling';
import { Debouncer } from '@lumino/polling';

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
    renderers: { [id: string]: Field };

    /**
     * Signal used to expand the plugin settings when selected.
     */
    handleSelectSignal: ISignal<PluginList, string>;

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
  }

  export interface IState {
    /**
     * The current form values being displayed in the editor.
     */
    formData: any;

    /**
     * Indicates whether the settings have been modified. Used for hiding
     * the "Restore to Default" button when there are no changes.
     */
    isModified: boolean;

    /**
     * Indicates whether the editor is collapsed / hidden or not.
     */
    hidden: boolean;
  }
}

/**
 * Template to allow for custom buttons to re-order / removal of entries in an array.
 * Necessary to create accessible buttons.
 */
const CustomArrayTemplate = (props: ArrayFieldTemplateProps) => {
  return (
    <div className={props.className}>
      <props.TitleField
        title={props.title}
        required={props.required}
        id={`${props.idSchema.$id}-title`}
      />
      <props.DescriptionField
        id={`${props.idSchema.$id}-title`}
        description={props.schema.description ?? ''}
      />
      {props.items.map(item => {
        return (
          <div key={item.key} className={item.className}>
            {item.children}
            <div className="jp-ArrayOperations">
              <button
                onClick={item.onReorderClick(item.index, item.index - 1)}
                disabled={!item.hasMoveUp}
              >
                Move Up
              </button>
              <button
                onClick={item.onReorderClick(item.index, item.index + 1)}
                disabled={!item.hasMoveDown}
              >
                Move Down
              </button>
              <button
                onClick={item.onDropIndexClick(item.index)}
                disabled={!item.hasRemove}
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}
      {props.canAdd && (
        <button
          className="array-item-add"
          onClick={() => {
            props.onAddClick();
          }}
        >
          Add
        </button>
      )}
    </div>
  );
};

/**
 * Renders the modified indicator and errors
 */
const CustomTemplate = (props: FieldTemplateProps) => {
  const {
    formData,
    schema,
    label,
    displayLabel,
    id,
    formContext,
    errors,
    rawErrors,
    children
  } = props;
  /**
   * Determine if the field has been modified
   * Schema Id is formatted as 'root_<field name>.<nexted field name>'
   * This logic parses out the field name to find the default value
   * before determining if the field has been modified.
   */
  const schemaIds = id.split('_');
  schemaIds.shift();
  const schemaId = schemaIds.join('.');
  let defaultValue;
  if (schemaIds.length === 1) {
    defaultValue = formContext.settings.default(schemaId);
  } else if (schemaIds.length > 1) {
    const allDefaultsForObject: any = {};
    allDefaultsForObject[schemaIds[0]] = formContext.settings.default(
      schemaIds[0]
    );
    defaultValue = reduce(
      schemaIds,
      (acc, val, i) => {
        return acc?.[val];
      },
      allDefaultsForObject
    );
  }
  const isModified =
    schemaId !== '' &&
    formData !== undefined &&
    defaultValue !== undefined &&
    !schema.properties &&
    schema.type !== 'array' &&
    !JSONExt.deepEqual(formData, defaultValue);

  return (
    <div
      className={`form-group ${
        (displayLabel || schema.type === 'boolean') && 'small-field'
      }`}
    >
      {
        // Only show the modified indicator if there are no errors
        isModified && !rawErrors && <div className="jp-modifiedIndicator" />
      }
      {
        // Shows a red indicator for fields that have validation errors
        rawErrors && <div className="jp-modifiedIndicator jp-errorIndicator" />
      }
      <div>
        {displayLabel && schemaId !== '' && <h3> {label} </h3>}
        <div className={`${schemaId === '' ? 'root' : 'inputFieldWrapper'}`}>
          {children}
        </div>
        <div className="validationErrors">{errors}</div>
      </div>
    </div>
  );
};

/**
 * A React component that prepares the settings for a
 * given plugin to be rendered in the FormEditor.
 */
export class SettingsFormEditor extends React.Component<
  SettingsFormEditor.IProps,
  SettingsFormEditor.IState
> {
  private _updateDirtyState: (dirty: boolean) => void;
  constructor(props: SettingsFormEditor.IProps) {
    super(props);
    const {
      settings,
      renderers,
      handleSelectSignal,
      hasError,
      onSelect,
      updateDirtyState
    } = props;
    this.state = {
      formData: settings.composite,
      isModified: settings.isModified,
      hidden: true
    };
    this._hasError = hasError;
    this._onSelect = onSelect;
    this._renderers = renderers;
    this._updateDirtyState = updateDirtyState;
    this.handleChange = this.handleChange.bind(this);
    this._settings = settings;
    this._debouncer = new Debouncer(this.handleChange, 3000);

    /**
     * Construct uiSchema to pass any custom renderers to the form editor.
     */
    const uiSchema: UiSchema = {};
    for (const id in renderers) {
      if (Object.keys(settings.schema.properties ?? {}).includes(id)) {
        uiSchema[id] = {
          'ui:field': id
        };
      }
    }
    this._uiSchema = uiSchema;

    /**
     * Automatically expand the settings if this plugin was selected in the
     * plugin list on the right
     */
    handleSelectSignal.connect((list: PluginList, id: string) => {
      if (id === settings.id) {
        this.setState({ hidden: false });
      }
    });
  }

  /**
   * Handler for edits made in the form editor.
   * @param data - Form data sent from the form editor
   */
  handleChange() {
    if (JSONExt.deepEqual(this.state.formData, this._settings.user)) {
      this._updateDirtyState(false);
      return;
    }
    this._settings
      .save(JSON.stringify(this.state.formData))
      .then(() => {
        this._updateDirtyState(false);
        this.setState({ isModified: this._settings.isModified });
      })
      .catch((reason: string) => {
        this._updateDirtyState(false);
        showDialog({ title: 'Error saving settings.', body: reason });
      });
  }

  /**
   * Handler for the "Restore to defaults" button - clears all
   * modified settings then calls `setFormData` to restore the
   * values.
   */
  reset = async () => {
    for (const field in this._settings.user) {
      await this._settings.remove(field);
    }
    this.setState({
      formData: this._settings.composite,
      isModified: false
    });
  };

  render() {
    return (
      <div>
        <div
          className="jp-SettingsHeader"
          onClick={() => {
            this.setState({ hidden: !this.state.hidden });
            this._onSelect(this._settings.id);
          }}
        >
          <div className="jp-SettingsTitle">
            <h2> {this._settings.schema.title} </h2>
            <h3> {this._settings.schema.description} </h3>
          </div>
          {this.state.isModified && (
            <button className="jp-RestoreButton" onClick={this.reset}>
              {' '}
              Restore to Defaults{' '}
            </button>
          )}
        </div>
        {!this.state.hidden && (
          <Form
            schema={this._settings.schema as JSONSchema7}
            formData={this.state.formData}
            FieldTemplate={CustomTemplate}
            ArrayFieldTemplate={CustomArrayTemplate}
            uiSchema={this._uiSchema}
            fields={this._renderers}
            formContext={{ settings: this._settings }}
            liveValidate
            idPrefix={`jp-SettingsEditor-${this._settings.id}`}
            onChange={(e: IChangeEvent<ReadonlyPartialJSONObject>) => {
              this._hasError(e.errors.length !== 0);
              this.setState({ formData: e.formData });
              if (e.errors.length === 0) {
                this._updateDirtyState(true);
                void this._debouncer.invoke();
              }
              this._onSelect(this._settings.id);
            }}
          />
        )}
      </div>
    );
  }

  private _debouncer: Debouncer<void, any>;
  private _settings: Settings;
  private _renderers: { [name: string]: Field } | undefined;
  private _uiSchema: UiSchema | undefined;
  private _onSelect: (id: string) => void;
  private _hasError: (error: boolean) => void;
}
