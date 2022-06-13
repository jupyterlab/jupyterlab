/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { showErrorMessage } from '@jupyterlab/apputils';
import { caretDownIcon, caretRightIcon } from '@jupyterlab/ui-components';
import { ISettingRegistry, Settings } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import { reduce } from '@lumino/algorithm';
import { JSONExt, ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { Debouncer } from '@lumino/polling';
import Form, {
  ArrayFieldTemplateProps,
  Field,
  FieldTemplateProps,
  IChangeEvent,
  ObjectFieldTemplateProps,
  UiSchema,
  utils
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
    filteredSchema: ISettingRegistry.ISchema;
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
 * Template to allow for custom buttons to re-order/remove entries in an array.
 * Necessary to create accessible buttons.
 */
const CustomArrayTemplateFactory = (
  translator: ITranslator
): React.FC<ArrayFieldTemplateProps> => {
  const trans = translator.load('jupyterlab');

  const factory = (props: ArrayFieldTemplateProps) => {
    return (
      <div className={props.className}>
        <props.TitleField
          title={props.title}
          required={props.required}
          id={`${props.idSchema.$id}-title`}
        />
        <props.DescriptionField
          id={`${props.idSchema.$id}-description`}
          description={props.schema.description ?? ''}
        />
        {props.items.map(item => {
          return (
            <div key={item.key} className={item.className}>
              {item.children}
              <div className="jp-ArrayOperations">
                <button
                  className="jp-mod-styled jp-mod-reject"
                  onClick={item.onReorderClick(item.index, item.index - 1)}
                  disabled={!item.hasMoveUp}
                >
                  {trans.__('Move Up')}
                </button>
                <button
                  className="jp-mod-styled jp-mod-reject"
                  onClick={item.onReorderClick(item.index, item.index + 1)}
                  disabled={!item.hasMoveDown}
                >
                  {trans.__('Move Down')}
                </button>
                <button
                  className="jp-mod-styled jp-mod-warn"
                  onClick={item.onDropIndexClick(item.index)}
                  disabled={!item.hasRemove}
                >
                  {trans.__('Remove')}
                </button>
              </div>
            </div>
          );
        })}
        {props.canAdd && (
          <button
            className="jp-mod-styled jp-mod-reject"
            onClick={props.onAddClick}
          >
            {trans.__('Add')}
          </button>
        )}
      </div>
    );
  };
  factory.displayName = 'CustomArrayTemplate';
  return factory;
};

/**
 * Template with custom add button, necessary for accessiblity and internationalization.
 */
const CustomObjectTemplateFactory = (
  translator: ITranslator
): React.FC<ObjectFieldTemplateProps> => {
  const trans = translator.load('jupyterlab');

  const factory = (props: ObjectFieldTemplateProps) => {
    const { TitleField, DescriptionField } = props;
    return (
      <fieldset id={props.idSchema.$id}>
        {(props.uiSchema['ui:title'] || props.title) && (
          <TitleField
            id={`${props.idSchema.$id}__title`}
            title={props.title || props.uiSchema['ui:title']}
            required={props.required}
          />
        )}
        {props.description && (
          <DescriptionField
            id={`${props.idSchema.$id}__description`}
            description={props.description}
          />
        )}
        {props.properties.map(property => property.content)}
        {utils.canExpand(props.schema, props.uiSchema, props.formData) && (
          <button
            className="jp-mod-styled jp-mod-reject"
            onClick={props.onAddClick(props.schema)}
            disabled={props.disabled || props.readonly}
          >
            {trans.__('Add')}
          </button>
        )}
      </fieldset>
    );
  };
  factory.displayName = 'CustomObjectTemplate';
  return factory;
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
    children,
    onKeyChange,
    onDropPropertyClick
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
  const isRoot = schemaId === '';

  const needsDescription =
    !isRoot &&
    schema.type != 'object' &&
    id !=
      'jp-SettingsEditor-@jupyterlab/shortcuts-extension:shortcuts_shortcuts';

  // While we can implement "remove" button for array items in array template,
  // object templates do not provide a way to do this; instead we need to add
  // buttons here (and first check if the field can be removed = is additional).
  const isAdditional = schema.hasOwnProperty(utils.ADDITIONAL_PROPERTY_FLAG);

  return (
    <div
      className={`form-group ${
        displayLabel || schema.type === 'boolean' ? 'small-field' : ''
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
      <div className="jp-FormGroup-content">
        {displayLabel && !isRoot && label && !isAdditional && (
          <h3 className="jp-FormGroup-fieldLabel jp-FormGroup-contentItem">
            {label}
          </h3>
        )}
        {isAdditional && (
          <input
            className="jp-FormGroup-contentItem jp-mod-styled"
            type="text"
            onBlur={event => onKeyChange(event.target.value)}
            defaultValue={label}
          />
        )}
        <div
          className={`${
            isRoot
              ? 'jp-root'
              : schema.type === 'object'
              ? 'jp-objectFieldWrapper'
              : 'jp-inputFieldWrapper jp-FormGroup-contentItem'
          }`}
        >
          {children}
        </div>
        {isAdditional && (
          <button
            className="jp-FormGroup-contentItem jp-mod-styled jp-mod-warn jp-FormGroup-removeButton"
            onClick={onDropPropertyClick(label)}
          >
            {'Remove'}
          </button>
        )}
        {schema.description && needsDescription && (
          <div className="jp-FormGroup-description">{schema.description}</div>
        )}
        {isModified && schema.default !== undefined && (
          <div className="jp-FormGroup-default">
            Default: {schema.default?.toLocaleString()}
          </div>
        )}
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
  constructor(props: SettingsFormEditor.IProps) {
    super(props);
    const { settings } = props;
    this._formData = settings.composite;
    this.state = {
      isModified: settings.isModified,
      uiSchema: {},
      filteredSchema: this.props.settings.schema,
      arrayFieldTemplate: CustomArrayTemplateFactory(this.props.translator),
      objectFieldTemplate: CustomObjectTemplateFactory(this.props.translator),
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
        arrayFieldTemplate: CustomArrayTemplateFactory(this.props.translator),
        objectFieldTemplate: CustomObjectTemplateFactory(this.props.translator)
      });
    }

    if (prevProps.settings !== this.props.settings) {
      this.setState({ formContext: { settings: this.props.settings } });
    }
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
        showErrorMessage(trans.__('Error saving settings.'), reason);
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
            FieldTemplate={CustomTemplate}
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
}
