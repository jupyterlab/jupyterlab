/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { showErrorMessage } from '@jupyterlab/apputils';
import {
  caretDownIcon,
  caretRightIcon,
  RJSFTemplatesFactory
} from '@jupyterlab/ui-components';
import { ISettingRegistry, Settings } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import { JSONExt, ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { Debouncer } from '@lumino/polling';
import Form, {
  ArrayFieldTemplateProps,
  Field,
  FieldTemplateProps,
  IChangeEvent,
  ObjectFieldTemplateProps,
  UiSchema
} from '@rjsf/core';
import { JSONSchema7 } from 'json-schema';
import React from 'react';
import { PluginList } from './pluginlist';

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
    renderers: { [id: string]: Field };

    /**
     * Whether the form is collapsed or not.
     */
    isCollapsed: boolean;

    /**
     * Callback with the collapse state value.
     */
    onCollapseChange: (v: boolean) => void;

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
     * Field template
     */
    fieldTemplate?: React.StatelessComponent<FieldTemplateProps<any>>;
    /**
     * Array Field template
     */
    arrayFieldTemplate?: React.StatelessComponent<ArrayFieldTemplateProps<any>>;
    /**
     * Object Field template
     */
    objectFieldTemplate?: React.StatelessComponent<
      ObjectFieldTemplateProps<any>
    >;
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
    this._formData = settings.composite;
    this._templateFactory = new RJSFTemplatesFactory({
      translator: this.props.translator,
      showModifiedFromDefault: true
    });
    this.state = {
      isModified: settings.isModified,
      uiSchema: {},
      filteredSchema: this.props.settings.schema,
      fieldTemplate: this._templateFactory.fieldTemplate,
      arrayFieldTemplate: this._templateFactory.arrayTemplate,
      objectFieldTemplate: this._templateFactory.objectTemplate,
      formContext: { settings: this.props.settings }
    };
    this.handleChange = this.handleChange.bind(this);
    this._debouncer = new Debouncer(this.handleChange);
  }

  componentDidMount(): void {
    this._setUiSchema();
    this._setFilteredSchema();
  }

  componentDidUpdate(prevProps: SettingsFormEditor.IProps): void {
    this._setUiSchema(prevProps.renderers);
    this._setFilteredSchema(prevProps.filteredValues);

    if (prevProps.translator !== this.props.translator) {
      this.setState({
        fieldTemplate: this._templateFactory.fieldTemplate,
        arrayFieldTemplate: this._templateFactory.arrayTemplate,
        objectFieldTemplate: this._templateFactory.objectTemplate
      });
    }

    if (prevProps.settings !== this.props.settings) {
      this.setState({ formContext: { settings: this.props.settings } });
    }
  }

  componentWillUnmount(): void {
    this._debouncer.dispose();
  }

  /**
   * Handler for edits made in the form editor.
   * @param data - Form data sent from the form editor
   */
  handleChange(): void {
    // Prevent unnecessary save when opening settings that haven't been modified.
    if (
      !this.props.settings.isModified &&
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
    this._formData = this.props.settings.composite;
    this.setState({ isModified: false });
  };

  render(): JSX.Element {
    const trans = this.props.translator.load('jupyterlab');
    const icon = this.props.isCollapsed ? caretRightIcon : caretDownIcon;

    return (
      <div>
        <div
          className="jp-SettingsHeader"
          onClick={() => {
            this.props.onCollapseChange(!this.props.isCollapsed);
            this.props.onSelect(this.props.settings.id);
          }}
        >
          <header className="jp-SettingsTitle">
            <icon.react
              tag="span"
              elementPosition="center"
              className="jp-SettingsTitle-caret"
            />
            <h2>{this.props.settings.schema.title}</h2>
            <div className="jp-SettingsHeader-description">
              {this.props.settings.schema.description}
            </div>
          </header>
          {this.state.isModified && (
            <button className="jp-RestoreButton" onClick={this.reset}>
              {trans.__('Restore to Defaults')}
            </button>
          )}
        </div>
        {!this.props.isCollapsed && (
          <Form
            schema={this.state.filteredSchema as JSONSchema7}
            formData={this._formData}
            FieldTemplate={this.state.fieldTemplate}
            ArrayFieldTemplate={this.state.arrayFieldTemplate}
            ObjectFieldTemplate={this.state.objectFieldTemplate}
            uiSchema={this.state.uiSchema}
            fields={this.props.renderers}
            formContext={this.state.formContext}
            liveValidate
            idPrefix={`jp-SettingsEditor-${this.props.settings.id}`}
            onChange={this._onChange}
          />
        )}
      </div>
    );
  }

  /**
   * Callback on plugin selection
   * @param list Plugin list
   * @param id Plugin id
   */
  protected onSelect = (list: PluginList, id: string): void => {
    if (id === this.props.settings.id) {
      this.props.onCollapseChange(false);
    }
  };

  private _onChange = (e: IChangeEvent<ReadonlyPartialJSONObject>): void => {
    this.props.hasError(e.errors.length !== 0);
    this._formData = e.formData;
    if (e.errors.length === 0) {
      this.props.updateDirtyState(true);
      void this._debouncer.invoke();
    }
    this.props.onSelect(this.props.settings.id);
  };

  private _setUiSchema(prevRenderers?: { [id: string]: Field }) {
    if (
      !prevRenderers ||
      !JSONExt.deepEqual(
        Object.keys(prevRenderers).sort(),
        Object.keys(this.props.renderers).sort()
      )
    ) {
      /**
       * Construct uiSchema to pass any custom renderers to the form editor.
       */
      const uiSchema: UiSchema = {};
      for (const id in this.props.renderers) {
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
    if (
      prevFilteredValues === undefined ||
      !JSONExt.deepEqual(prevFilteredValues, this.props.filteredValues)
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

      this.setState({ filteredSchema });
    }
  }

  private _debouncer: Debouncer<void, any>;
  private _formData: any;
  private _templateFactory: RJSFTemplatesFactory;
}
