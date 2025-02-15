/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import React from 'react';

import { showErrorMessage } from '@jupyterlab/apputils';
import { ISettingRegistry, Settings } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import { FormComponent } from '@jupyterlab/ui-components';
import {
  JSONExt,
  PartialJSONObject,
  ReadonlyJSONObject,
  ReadonlyPartialJSONObject
} from '@lumino/coreutils';
import { Debouncer } from '@lumino/polling';
import { IChangeEvent } from '@rjsf/core';
import validatorAjv8 from '@rjsf/validator-ajv8';
import { Field, UiSchema } from '@rjsf/utils';
import { JSONSchema7 } from 'json-schema';
import { Button } from '@jupyterlab/ui-components';

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
     * List of strings that match search value.
     */
    filteredValues: string[] | null;
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
      uiSchema: {},
      filteredSchema: this.props.settings.schema,
      formContext: {
        defaultFormData: this.props.settings.default(),
        settings: this.props.settings,
        schema: JSONExt.deepCopy(this.props.settings.schema)
      }
    };
    this.handleChange = this.handleChange.bind(this);
    this._debouncer = new Debouncer(this.handleChange);
  }

  componentDidMount(): void {
    this._setUiSchema();
    this._setFilteredSchema();
  }

  componentDidUpdate(prevProps: SettingsFormEditor.IProps): void {
    this._setUiSchema(prevProps.renderers[prevProps.settings.id]);
    this._setFilteredSchema(prevProps.filteredValues);

    if (prevProps.settings !== this.props.settings) {
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
    this._debouncer.dispose();
  }

  /**
   * Handler for edits made in the form editor.
   */
  handleChange(): void {
    // Prevent unnecessary save when opening settings that haven't been modified.
    if (
      !this.props.settings.isModified &&
      this._formData &&
      this.props.settings.isDefault(this._formData)
    ) {
      this.props.updateDirtyState(false);
      return;
    }
    this.props.settings
      .save(JSON.stringify(this._formData, undefined, JSON_INDENTATION))
      .then(() => {
        this.props.updateDirtyState(false);
        this.setState({ isModified: this.props.settings.isModified });
      })
      .catch((reason: string) => {
        this.props.updateDirtyState(false);
        const trans = this.props.translator.load('jupyterlab');
        void showErrorMessage(trans.__('Error saving settings.'), reason);
      });
  }

  /**
   * Handler for the "Restore to defaults" button - clears all
   * modified settings then calls `setFormData` to restore the
   * values.
   */
  reset = async (event: React.MouseEvent): Promise<void> => {
    event.stopPropagation();
    for (const field in this.props.settings.user) {
      await this.props.settings.remove(field);
    }
    this._formData = this.props.settings.composite as ReadonlyJSONObject;
    this.setState({ isModified: false });
  };

  private _syncFormDataWithSettings = () => {
    this._formData = this.props.settings.composite as ReadonlyJSONObject;
    this.setState((prevState, props) => ({
      isModified: props.settings.isModified
    }));
  };

  render(): JSX.Element {
    const trans = this.props.translator.load('jupyterlab');

    return (
      <>
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
          translator={this.props.translator}
          experimental_defaultFormStateBehavior={{
            emptyObjectFields: 'populateRequiredDefaults'
          }}
        />
      </>
    );
  }

  private _onChange = (e: IChangeEvent<ReadonlyPartialJSONObject>): void => {
    this.props.hasError(e.errors.length !== 0);
    this._formData = e.formData as ReadonlyJSONObject;
    if (e.errors.length === 0) {
      this.props.updateDirtyState(true);
      void this._debouncer.invoke();
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
      /**
       * Construct uiSchema to pass any custom renderers to the form editor.
       */
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
      this.setState({ uiSchema });
    }
  }

  private _setFilteredSchema(prevFilteredValues?: string[] | null) {
    // Update the filtered value if the filter or the schema has changed.
    if (
      prevFilteredValues === undefined ||
      !JSONExt.deepEqual(prevFilteredValues, this.props.filteredValues) ||
      !JSONExt.deepEqual(
        this.state.formContext.schema,
        this.props.settings.schema
      )
    ) {
      /**
       * Only show fields that match search value.
       */
      const filteredSchema = JSONExt.deepCopy(this.props.settings.schema);
      if (this.props.filteredValues?.length ?? 0 > 0) {
        for (const field in filteredSchema.properties) {
          if (
            !this.props.filteredValues?.includes(
              filteredSchema.properties[field].title ?? field
            )
          ) {
            delete filteredSchema.properties[field];
          }
        }
      }
      this.setState(previousState => ({
        filteredSchema,
        formContext: {
          ...previousState.formContext,
          schema: JSONExt.deepCopy(this.props.settings.schema)
        }
      }));
    }
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

  private _debouncer: Debouncer<void, any>;
  private _formData: ReadonlyJSONObject;
}
