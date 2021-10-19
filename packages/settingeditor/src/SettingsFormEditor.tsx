/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Settings } from '@jupyterlab/settingregistry';
import { showDialog } from '@jupyterlab/apputils';
import React from 'react';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import Form, { FieldTemplateProps, UiSchema } from '@rjsf/core';
import { JSONSchema7 } from 'json-schema';
import { JSONExt } from '@lumino/coreutils';
import { reduce } from '@lumino/algorithm';
interface IProps {
  settings: Settings;
  renderers: { [id: string]: any };
  translator?: ITranslator;
}

const CustomTemplate = (props: FieldTemplateProps) => {
  const {
    formData,
    schema,
    label,
    displayLabel,
    id,
    formContext,
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
      {isModified ? <div className="jp-modifiedIndicator" /> : undefined}
      <div>
        {displayLabel && id !== 'root' ? <h3> {label} </h3> : undefined}
        {children}
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
  translator
}: IProps) => {
  const [formData, setFormData] = React.useState(settings.user);
  const [isModified, setIsModified] = React.useState(settings.isModified);
  const [hidden, setHidden] = React.useState(true);

  const trans = translator || nullTranslator;
  const _trans = trans.load('jupyterlab');

  const uiSchema: UiSchema = {};
  for (const id in renderers) {
    if (Object.keys(settings.schema.properties ?? {}).includes(id)) {
      uiSchema[id] = {
        'ui:field': id
      };
    }
  }

  /**
   * Handler for the "Restore to defaults" button - clears all
   * modified settings then calls `updateSchema` to restore the
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
   * @param fieldName - ID of field being edited
   * @param value - New value for field
   * @param category - Optional category if field is under a category
   */
  const handleChange = (data: any) => {
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
        <h2> {settings.schema.title} </h2>
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
          formContext={{
            settings: settings,
            translator: _trans
          }}
          noValidate={true}
          onChange={e => {
            setFormData(e.formData);
            handleChange(e.formData);
          }}
        />
      )}
    </div>
  );
};
