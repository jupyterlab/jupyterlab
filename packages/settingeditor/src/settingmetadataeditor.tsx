import { FormEditor, IFormComponentRegistry } from '@jupyterlab/formeditor';
import { ISettingRegistry, Settings } from '@jupyterlab/settingregistry';
import { PartialJSONObject } from '@lumino/coreutils';
import { ReactWidget, showDialog } from '@jupyterlab/apputils';
import React from 'react';
import { Button } from '@jupyterlab/ui-components';

interface IWidgetProps {
  plugin: ISettingRegistry.IPlugin;
  registry: ISettingRegistry;
  componentRegistry: IFormComponentRegistry;
}

interface IProps {
  settings: Settings;
  componentRegistry: IFormComponentRegistry;
}

export class SettingsFormEditorWidget extends ReactWidget {
  plugin: ISettingRegistry.IPlugin;
  componentRegistry: IFormComponentRegistry;
  settings?: Settings;

  constructor(props: IWidgetProps) {
    super();
    this.plugin = props.plugin;
    this.componentRegistry = props.componentRegistry;
    void props.registry.load(this.plugin.id).then((value: Settings) => {
      this.settings = value;
      this.update();
    });
  }

  render() {
    if (this.settings) {
      return (
        <SettingsMetadataEditor
          componentRegistry={this.componentRegistry}
          settings={this.settings}
        />
      );
    } else {
      return <div />;
    }
  }
}

export const SettingsMetadataEditor = ({
  settings,
  componentRegistry
}: IProps) => {
  const [data, setData] = React.useState({} as FormEditor.IData);
  const [schema, setSchema] = React.useState({} as FormEditor.ISchema);
  const [title, setTitle] = React.useState('');
  const [modifiedFields, setModifiedFields] = React.useState(
    settings.modifiedFields
  );

  const reset = () => {
    settings.resetAll();
    try {
      updateSchema();
    } catch (error) {
      console.log(error);
    }
  };

  const updateSchema = () => {
    let initialData: any = {};
    try {
      initialData = JSON.parse(settings.raw);
    } catch (error) {
      console.log(error);
    }
    if (!settings.schema) {
      return;
    }
    const properties: any = { _noCategory: {} };
    const current = JSON.parse(JSON.stringify(initialData));
    setTitle(settings.schema.title ?? '');
    setModifiedFields(settings.modifiedFields);
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
        properties['_noCategory'][prop] = {
          title: options.title,
          type: options.type,
          uihints: {
            field_type: options.renderer_id,
            modified: modifiedFields.includes(prop),
            default: options.default
          }
        };
        current[prop] = initialData[prop] ?? options.default;
      } else if (Object.keys(options.properties ?? {}).length > 0) {
        properties[prop] = {};
        for (const subProp in options.properties) {
          const subOptions = options.properties[subProp];
          if (subOptions.enum) {
            properties[prop][subProp] = {
              title: subOptions.title ?? subProp,
              enum: subOptions.enum,
              uihints: {
                field_type: 'dropdown',
                category: options.title,
                default: options.default
              }
            };
          } else if (typeof subOptions.type === 'object') {
            properties[prop][subProp] = {
              title: subOptions.title ?? subProp,
              uihints: {
                category: options.title,
                default: (options.default as any)?.[subProp]
              }
            };
          } else {
            properties[prop][subProp] = {
              title: subOptions.title ?? subProp,
              type: subOptions.type,
              uihints: {
                field_type: subOptions.type,
                category: options.title,
                default: (options.default as any)?.[subProp]
              }
            };
          }
          current[subProp] =
            initialData[prop]?.[subProp] ?? (options.default as any)?.[subProp];
        }
      } else if (options.enum || (options.additionalProperties as any)?.enum) {
        properties['_noCategory'][prop] = {
          title: options.title,
          enum: options.enum ?? (options.additionalProperties as any).enum,
          uihints: {
            field_type: 'dropdown',
            modified: modifiedFields.includes(prop),
            default: options.default
          }
        };
        current[prop] = initialData[prop] ?? options.default;
      } else if (typeof options.type === 'object') {
        properties['_noCategory'][prop] = {
          title: options.title,
          uihints: {
            field_type: 'string',
            modified: modifiedFields.includes(prop),
            default: options.default
          }
        };
        current[prop] = initialData[prop] ?? options.default;
      } else if (options.type === 'array') {
        properties['_noCategory'][prop] = {
          title: options.title,
          uihints: {
            field_type: options.type,
            modified: modifiedFields.includes(prop),
            default: options.default
          }
        };
        current[prop] = initialData[prop] ?? options.default;
      } else if (typeof options.default === 'object') {
        for (const subProp in options.default) {
          properties[prop][subProp] = {
            title: subProp,
            uihints: {
              field_type: typeof (options.default as any)[subProp],
              default: (options.default as any)[subProp]
            }
          };
          current[subProp] =
            initialData[prop]?.[subProp] ?? (options.default as any)?.[subProp];
        }
      } else {
        properties['_noCategory'][prop] = {
          title: options.title,
          type: options.type,
          uihints: {
            field_type: options.type,
            modified: modifiedFields.includes(prop),
            default: options.default
          }
        };
        current[prop] = initialData[prop] ?? options.default;
      }
    }
    setSchema(properties);
    setData(current);
  };

  const getFormattedSettings = (values: FormEditor.IData) => {
    const formattedSettings: any = {};
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

  React.useEffect(() => {
    updateSchema();
  }, []);

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
    if (hasInvalidFields(values)) {
      return;
    }

    void settings
      .save(getFormattedSettings(values))
      .then(() => {
        updateSchema();
      })
      .catch((reason: { stack: any }) => {
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
  };

  return (
    <div className="jp-SettingsEditor">
      <div className="jp-SettingsHeader">
        <h3>{title}</h3>
        {modifiedFields.length > 0 ? (
          <Button onClick={reset}> Restore to Defaults </Button>
        ) : undefined}
      </div>
      <FormEditor
        schema={schema}
        initialData={data}
        handleChange={handleChange}
        componentRegistry={componentRegistry}
      />
    </div>
  );
};
