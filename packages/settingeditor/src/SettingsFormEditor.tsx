/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Settings } from '@jupyterlab/settingregistry';
import { showDialog } from '@jupyterlab/apputils';
import React from 'react';
import Form, { FieldTemplateProps, IChangeEvent, UiSchema } from '@rjsf/core';
import { JSONSchema7 } from 'json-schema';
import { JSONExt, ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { reduce } from '@lumino/algorithm';
import { PluginList } from './pluginlist';
import { ISignal } from '@lumino/signaling';
interface IProps {
  settings: Settings;
  renderers: { [id: string]: React.FC };
  handleSelectSignal: ISignal<PluginList, string>;
  hasError: (error: boolean) => void;
}

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
        displayLabel || schema.type === 'boolean' ? 'small-field' : ''
      }`}
    >
      {isModified && !rawErrors ? (
        <div className="jp-modifiedIndicator" />
      ) : undefined}
      {rawErrors ? (
        <div className="jp-modifiedIndicator jp-errorIndicator" />
      ) : undefined}
      <div>
        {displayLabel && id !== 'root' ? <h3> {label} </h3> : undefined}
        <div className="inputFieldWrapper">{children}</div>
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
  hasError
}: IProps) => {
  const [formData, setFormData] = React.useState(settings.user);
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
    setFormData(settings.user);
  };

  /**
   * Handler for edits made in the form editor.
   * @param data - Form data sent from the form editor
   */
  const handleChange = (data: ReadonlyPartialJSONObject) => {
    let user = {};
    try {
      user = settings.raw !== '' ? JSON.parse(settings.raw) : {};
    } catch {
      console.log('Error parsing raw settings.');
    }
    if (JSONExt.deepEqual(data, user)) {
      return;
    }
    settings
      .save(JSON.stringify(data))
      .then(() => {
        setIsModified(settings.isModified);
      })
      .catch(reason =>
        showDialog({ title: 'Error saving settings.', body: reason })
      );
  };

  return (
    <div>
      <div
        className="jp-SettingsHeader"
        onClick={() => {
          setHidden(!hidden);
        }}
      >
        <div className="jp-SettingsTitle">
          <h2> {settings.schema.title} </h2>
          <h3> {settings.schema.description} </h3>
        </div>
        {isModified ? (
          <button className="jp-RestoreButton" onClick={reset}>
            {' '}
            Restore to Defaults{' '}
          </button>
        ) : undefined}
      </div>
      {hidden ? undefined : (
        <Form
          schema={settings.schema as JSONSchema7}
          formData={formData}
          FieldTemplate={CustomTemplate}
          uiSchema={uiSchema}
          fields={renderers}
          formContext={{ settings: settings }}
          liveValidate
          onChange={(e: IChangeEvent<ReadonlyPartialJSONObject>) => {
            setFormData(e.formData);
            if (e.errors.length === 0) {
              handleChange(e.formData);
              hasError(false);
            } else {
              hasError(true);
            }
          }}
        />
      )}
    </div>
  );
};
