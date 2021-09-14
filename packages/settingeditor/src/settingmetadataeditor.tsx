import {
  FormComponentRegistry,
  FormEditor,
  IFormComponentRegistry
} from '@jupyterlab/formeditor';
import { ISchemaValidator, Settings } from '@jupyterlab/settingregistry';
import { PartialJSONObject } from '@lumino/coreutils';
import { showDialog } from '@jupyterlab/apputils';
import React from 'react';
import { Button } from '@jupyterlab/ui-components';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

interface IProps {
  settings: Settings;
  componentRegistry: IFormComponentRegistry;
  translator?: ITranslator;
}

/**
 * A React component that prepares the settings for a
 * given plugin to be rendered in the FormEditor.
 */
export const SettingsMetadataEditor = ({
  settings,
  componentRegistry,
  translator
}: IProps) => {
  const [schema, setSchema] = React.useState({} as FormEditor.ISchema);
  const [title, setTitle] = React.useState('');

  const trans = translator || nullTranslator;
  const _trans = trans.load('jupyterlab');

  const reset = async () => {
    for (const field of settings.modifiedFields) {
      await settings.remove(field);
    }
    updateSchema();
  };

  const getProperties = (
    options: any,
    fieldName: string,
    category?: { id: string; label: string }
  ): FormComponentRegistry.IRendererProps => {
    return {
      value: category?.id
        ? (settings.get(category?.id).composite as any)[fieldName]
        : settings.get(fieldName).composite,
      handleChange: (newValue: any) =>
        handleChange(fieldName, newValue, category?.id),
      uihints: {
        category: category,
        label: options.title ? _trans.__(options.title) : fieldName,
        field_type: options.enum
          ? 'dropdown'
          : typeof options.field_type === 'object'
          ? options.field_type[0]
          : options.renderer_id ?? options.type ?? typeof options.default,
        title: options.title ? _trans.__(options.title) : fieldName,
        ...options
      }
    };
  };

  const updateSchema = (errors?: ISchemaValidator.IError[]) => {
    const properties: FormEditor.ISchema = {};
    setTitle(settings.schema.title ?? '');
    for (const prop in settings.schema.properties) {
      let ref = settings.schema.properties[prop]['$ref'] as string;
      let options = settings.schema.properties[prop];
      if (ref) {
        ref = ref.substring(14);
        options = {
          ...options,
          ...((settings.schema.definitions as PartialJSONObject)?.[
            ref
          ] as PartialJSONObject)
        };
      }
      if (options.properties && ref) {
        for (const subProp in options.properties) {
          const subOptions = options.properties[subProp];
          subOptions.default = (options.default as any)[subProp];
          if (errors) {
            const error = errors.filter(
              err => err.dataPath === `.${prop}.${subProp}`
            );
            subOptions.error = error?.[0]?.message;
          }
          properties[subProp] = getProperties(subOptions, subProp, {
            id: prop,
            label: options.title ? _trans.__(options.title) : prop
          });
        }
      } else {
        const options = settings.schema.properties[prop];
        if (errors) {
          const error = errors.filter(err => err.dataPath === `.${prop}`);
          options.error = error?.[0]?.message;
        }
        properties[prop] = getProperties(options, prop);
      }
    }
    setSchema(properties);
  };

  React.useEffect(() => {
    updateSchema();
  }, []);

  const handleChange = (fieldName: string, value: any, category?: string) => {
    const current: any = settings.composite;
    if (category) {
      current[category][fieldName] = value;
    } else {
      current[fieldName] = value;
    }
    const errors = settings.validate(JSON.stringify(current));
    if (errors) {
      updateSchema(errors);
    } else {
      settings
        .set(
          category ?? fieldName,
          category ? current[category] : current[fieldName]
        )
        .then(() => {
          updateSchema();
        })
        .catch(reason =>
          showDialog({ title: 'Error saving settings.', body: reason })
        );
    }
  };

  return (
    <div className="jp-SettingsEditor">
      <div className="jp-SettingsHeader">
        <h3>{_trans.__(title)}</h3>
        {settings.modifiedFields.length > 0 ? (
          <Button onClick={reset}> Restore to Defaults </Button>
        ) : undefined}
      </div>
      <FormEditor
        schema={schema}
        handleChange={handleChange}
        componentRegistry={componentRegistry}
      />
    </div>
  );
};
