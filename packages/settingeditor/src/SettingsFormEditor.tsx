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
import debounce from 'lodash/debounce';

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
export const SettingsFormEditor = ({
  settings,
  renderers,
  handleSelectSignal,
  hasError,
  onSelect
}: SettingsFormEditor.IProps) => {
  const [formData, setFormData] = React.useState(settings.composite);
  const [isModified, setIsModified] = React.useState(settings.isModified);
  const [hidden, setHidden] = React.useState(true);

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

  /**
   * Automatically expand the settings if this plugin was selected in the
   * plugin list on the right
   */
  handleSelectSignal.connect((list: PluginList, id: string) => {
    if (id === settings.id) {
      setHidden(false);
    }
  });

  /**
   * Handler for the "Restore to defaults" button - clears all
   * modified settings then calls `setFormData` to restore the
   * values.
   */
  const reset = async () => {
    for (const field in settings.user) {
      await settings.remove(field);
    }
    setFormData(settings.composite);
    setIsModified(false);
  };

  /**
   * Handler for edits made in the form editor.
   * @param data - Form data sent from the form editor
   */
  const handleChange = (data: any) => {
    if (JSONExt.deepEqual(data, settings.user)) {
      return;
    }
    settings
      .save(JSON.stringify(data))
      .then(() => {
        setIsModified(settings.isModified);
      })
      .catch((reason: string) =>
        showDialog({ title: 'Error saving settings.', body: reason })
      );
  };
  const debouncer = React.useRef(
    debounce(nextValue => handleChange(nextValue), 1000)
  );

  return (
    <div>
      <div
        className="jp-SettingsHeader"
        onClick={() => {
          setHidden(!hidden);
          onSelect(settings.id);
        }}
      >
        <div className="jp-SettingsTitle">
          <h2> {settings.schema.title} </h2>
          <h3> {settings.schema.description} </h3>
        </div>
        {isModified && (
          <button className="jp-RestoreButton" onClick={reset}>
            {' '}
            Restore to Defaults{' '}
          </button>
        )}
      </div>
      {!hidden && (
        <Form
          schema={settings.schema as JSONSchema7}
          formData={formData}
          FieldTemplate={CustomTemplate}
          ArrayFieldTemplate={CustomArrayTemplate}
          uiSchema={uiSchema}
          fields={renderers}
          formContext={{ settings: settings }}
          liveValidate
          idPrefix={`jp-SettingsEditor-${settings.id}`}
          onChange={(e: IChangeEvent<ReadonlyPartialJSONObject>) => {
            hasError(e.errors.length !== 0);
            setFormData(e.formData);
            if (e.errors.length === 0) {
              debouncer.current?.(e.formData);
            }
            onSelect(settings.id);
          }}
        />
      )}
    </div>
  );
};
