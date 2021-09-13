import {
  FormComponentRegistry,
  FormEditor,
  IFormComponentRegistry
} from '@jupyterlab/formeditor';
import {
  ISchemaValidator,
  ISettingRegistry,
  Settings
} from '@jupyterlab/settingregistry';
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

/**
 * A React component that prepares the settings for a
 * given plugin to be rendered in the FormEditor.
 */
export const SettingsMetadataEditor = ({
  settings,
  componentRegistry
}: IProps) => {
  const [schema, setSchema] = React.useState({} as FormEditor.ISchema);
  const [title, setTitle] = React.useState('');

  const reset = async () => {
    for (const field of settings.modifiedFields) {
      await settings.remove(field);
    }
    updateSchema();
  };

  const getProperties = (
    options: any,
    fieldName: string,
    category?: string
  ): FormComponentRegistry.IRendererProps => {
    return {
      value: category
        ? (settings.get(category).composite as any)[fieldName]
        : settings.get(fieldName).composite,
      handleChange: (newValue: any) =>
        handleChange(fieldName, newValue, category),
      uihints: {
        category: category,
        label: options.title ?? fieldName,
        field_type: options.enum
          ? 'dropdown'
          : typeof options.field_type === 'object'
          ? options.field_type[0]
          : options.renderer_id ?? options.type ?? typeof options.default,
        title: options.title ?? fieldName,
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
      if (options.properties) {
        for (const subProp in options.properties) {
          const subOptions = options.properties[subProp];
          subOptions.default = (options.default as any)[subProp];
          if (errors) {
            const error = errors.filter(
              err => err.dataPath === `.${prop}.${subProp}`
            );
            subOptions.error = error?.[0]?.message;
          }
          properties[subProp] = getProperties(subOptions, subProp, prop);
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
        <h3>{title}</h3>
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
