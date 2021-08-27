import { IFormComponentRegistry, FormComponentRegistry, FormEditor } from '@jupyterlab/formeditor';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { PartialJSONObject } from '@lumino/coreutils';
import { showDialog, ReactWidget } from '@jupyterlab/apputils';
import React from 'react';
import { Button } from '@jupyterlab/ui-components';

interface IProps {
  plugin: ISettingRegistry.IPlugin;
  registry: ISettingRegistry;
  componentRegistry: IFormComponentRegistry;
}

export class SettingsFormEditorWidget extends ReactWidget {
  plugin: ISettingRegistry.IPlugin;
  registry: ISettingRegistry;
  componentRegistry: IFormComponentRegistry;

  constructor(props: IProps) {
    super();
    this.plugin = props.plugin;
    this.registry = props.registry;
    this.componentRegistry = props.componentRegistry;
  }

  render() {
    return (<SettingsMetadataEditor
      componentRegistry={this.componentRegistry}
      plugin={this.plugin}
      registry={this.registry}
    />);
  }
}

export const SettingsMetadataEditor = ({
  plugin,
  registry,
  componentRegistry
}: IProps) => {
  const [data, setData] = React.useState({} as FormEditor.IData);
  const [schema, setSchema] = React.useState({} as FormEditor.ISchema);
  const [settings, setSettings] = React.useState(Object);
  const [title, setTitle] = React.useState('');
  const [modifiedFields, setModifiedFields] = React.useState([] as string[]);
  let defaultMetadata: FormEditor.IData = {};
  
  React.useEffect(() => {
    registry.load(plugin.id).then(
      (newSettings: ISettingRegistry.ISettings) => {
        setSettings(newSettings)
      }
    );
  }, []);
  
  const reset = React.useCallback(() => {
    for (const field of settings?.modifiedFields) {
      void settings.remove(field);
    }
  }, [settings]);

  React.useEffect(() => {
    try {
      setData(JSON.parse(settings.raw));
    } catch {}
    if (!settings.schema) {
      return;
    }
    const properties: any = {};
    const current = JSON.parse(JSON.stringify(data));
    setTitle(settings.schema.title);
    for (const prop in settings.schema.properties) {
      let ref = settings.schema.properties[prop]['$ref'] as string;
      if (ref) {
        ref = ref.substring(14);
      }
      const options = {
        ...settings.schema.properties[prop],
        ...((settings.schema.definitions as PartialJSONObject)?.[
          ref || prop
        ] as PartialJSONObject)
      };
      if (options.renderer_id) {
        properties[prop] = {
          title: options.title,
          type: options.type,
          uihints: {
            field_type: options.renderer_id,
            modified: modifiedFields.includes(prop)
          }
        };
        current[prop] = data[prop] ?? options.default;
        defaultMetadata[prop] = options.default;
      } else if (Object.keys(options.properties ?? {}).length > 0) {
        for (const subProp in options.properties) {
          const subOptions = options.properties[subProp];
          if (subOptions.enum) {
            properties[subProp] = {
              title: subOptions.title ?? subProp,
              enum: subOptions.enum,
              uihints: {
                field_type: 'dropdown',
                category: options.title
              }
            };
          } else if (typeof subOptions.type === 'object') {
            properties[subProp] = {
              title: subOptions.title ?? subProp,
              uihints: {
                category: options.title
              }
            };
          } else {
            properties[subProp] = {
              title: subOptions.title ?? subProp,
              type: subOptions.type,
              uihints: {
                field_type: subOptions.type,
                category: options.title
              }
            };
          }
          current[subProp] =
            data[prop]?.[subProp] ??
            (options.default as any)?.[subProp];
          defaultMetadata[subProp] = (options.default as any)?.[subProp];
        }
      } else if (options.enum || (options.additionalProperties as any)?.enum) {
        properties[prop] = {
          title: options.title,
          enum: options.enum ?? (options.additionalProperties as any).enum,
          uihints: {
            field_type: 'dropdown',
            modified: modifiedFields.includes(prop)
          }
        };
        current[prop] = data[prop] ?? options.default;
        defaultMetadata[prop] = options.default;
      } else if (typeof options.type === 'object') {
        properties[prop] = {
          title: options.title,
          uihints: {
            field_type: 'string',
            modified: modifiedFields.includes(prop)
          }
        };
        current[prop] = data[prop] ?? options.default;
        defaultMetadata[prop] = options.default;
      } else if (options.type === 'array') {
        properties[prop] = {
          title: options.title,
          uihints: {
            field_type: options.type,
            modified: modifiedFields.includes(prop)
          }
        };
        current[prop] = data[prop] ?? options.default;
        defaultMetadata[prop] = options.default;
      } else if (typeof options.default === 'object') {
        for (const subProp in options.default) {
          properties[subProp] = {
            title: subProp,
            uihints: {
              field_type: typeof (options.default as any)[subProp]
            }
          };
          current[subProp] =
            data[prop]?.[subProp] ??
            (options.default as any)?.[subProp];
          defaultMetadata[subProp] = (options.default as any)?.[subProp];
        }
      } else {
        properties[prop] = {
          title: options.title,
          type: options.type,
          uihints: {
            field_type: options.type,
            modified: modifiedFields.includes(prop)
          }
        };
        current[prop] = data[prop] ?? options.default;
        defaultMetadata[prop] = options.default;
      }
    }
    setSchema(getSchemaPropertiesByCategory(properties));
    setData(current);
    setModifiedFields(settings?.modifiedFields)
  }, [settings]);

  const getSchemaPropertiesByCategory = (properties: any): FormEditor.ISchema => {
    // Find categories of all schema properties
    const schemaPropertiesByCategory: { [cat: string]: { [fieldName: string]: FormComponentRegistry.IRendererProps } } = { _noCategory: {} };
    for (const schemaProperty in properties) {
      const category =
        properties[schemaProperty].uihints &&
        properties[schemaProperty].uihints.category;
      if (!category) {
        schemaPropertiesByCategory['_noCategory'][schemaProperty] = properties[schemaProperty];
      } else if (schemaPropertiesByCategory[category]) {
        schemaPropertiesByCategory[category][schemaProperty] = properties[schemaProperty];
      } else {
        schemaPropertiesByCategory[category] = {};
        schemaPropertiesByCategory[category][schemaProperty] = properties[schemaProperty];
      }
    }
    return schemaPropertiesByCategory;
  };

  const getFormattedSettings = (values: FormEditor.IData) => {
    const formattedSettings: any = {};
    for (const prop in settings.schema.properties) {
      const options = {
        ...settings.schema.properties[prop],
        ...((settings.schema.definitions as PartialJSONObject)?.[
          prop
        ] as PartialJSONObject)
      };
      if (options.properties && Object.keys(options.properties).length > 0) {
        formattedSettings[prop] = {};
        for (const subProp in options.properties) {
          if (
            (options.properties[subProp].type === 'number' ||
              (typeof options.properties[subProp].type === 'object' &&
                ((options.properties[subProp].type as any)?.includes(
                  'number'
                ) ||
                  (options.properties[subProp].type as any)?.includes(
                    'integer'
                  )))) &&
            values[subProp]
          ) {
            formattedSettings[prop][subProp] = parseInt(values[subProp]);
          } else if (
            (options.properties[subProp].items as any)?.type === 'number' &&
            values[subProp]
          ) {
            formattedSettings[prop][subProp] = JSON.parse(
              JSON.stringify(values[subProp])
            );
            for (const i in formattedSettings[prop][subProp]) {
              formattedSettings[prop][subProp][i] = parseInt(
                formattedSettings[prop][subProp][i]
              );
            }
          } else {
            formattedSettings[prop][subProp] = values[subProp];
          }
        }
      } else if (
        (options.type === 'number' ||
          (typeof options.type === 'object' &&
            options.type.includes('number'))) &&
            values[prop] !== null &&
            values[prop] !== undefined
      ) {
        formattedSettings[prop] = parseInt(values[prop]);
      } else {
        formattedSettings[prop] = values[prop];
      }
    }
    return JSON.stringify(formattedSettings);
  };

  const hasInvalidFields = (values: FormEditor.IData) => {
    const errors = settings.validate(getFormattedSettings(values));
    if (errors && errors.length > 0) {
      const newSchema = JSON.parse(JSON.stringify(schema));
      for (const error of errors) {
        const schemaField = error.dataPath.substring(1);
        newSchema[schemaField].uihints.error = error.message;
      }
      setSchema(newSchema);
      return true;
    } else {
      const newSchema = JSON.parse(JSON.stringify(schema));
      for (const cat in newSchema) {
        for (const schemaField in newSchema[cat]) {
          newSchema[cat][schemaField].uihints.error = undefined;
        }
      }
      setSchema(newSchema);
      return false;
    }
  };

  const saveMetadata = (values: FormEditor.IData) => {
    if (!registry) {
      return undefined;
    }
    if (hasInvalidFields(values)) {
      return;
    }

    void settings
      .save(getFormattedSettings(values))
      .then(() => {
        setModifiedFields(settings?.modifiedFields)
        for (const fieldName of modifiedFields) {
          const newSchema = JSON.parse(JSON.stringify(schema));
          for (const cat in newSchema) {
            if (newSchema[cat][fieldName]) {
              newSchema[cat][fieldName].uihints.modified = true;
            }
          }
          setSchema(newSchema);
        }
      })
      .catch((reason: { stack: any; }) => {
        void showDialog({
          title: 'Validation error',
          body: reason.stack
        });
      });
  };
  
  const handleChange = (fieldName: string, value: any) => {
    const newData = JSON.parse(JSON.stringify(data));
    newData[fieldName] = value;
    setData(newData);
    saveMetadata(newData);
  }

  return (
    <div className="jp-SettingsEditor">
      <div className="jp-SettingsHeader">
        <h3>{title}</h3>
        { modifiedFields.length > 0 ? <Button onClick={reset}> Restore to Defaults </Button> : undefined}
      </div>
      <FormEditor
        schema={schema}
        initialData={data}
        handleChange={handleChange}
        componentRegistry={componentRegistry}
      />
    </div>
  )
}
