import {
  ArrayInput,
  DropDown,
  IMetadataEditorProps,
  MetadataEditor,
  TextInput
} from '@jupyterlab/formeditor';
import { ISettingRegistry, Settings } from '@jupyterlab/settingregistry';
import { PartialJSONObject } from '@lumino/coreutils';
import { showDialog } from '@jupyterlab/apputils';
import { Checkbox, FormControlLabel, InputLabel } from '@material-ui/core';
import React from 'react';
import { ISettingEditorRegistry } from './tokens';

interface IProps extends IMetadataEditorProps {
  settings: ISettingRegistry.IPlugin;
  registry: ISettingRegistry;
  editorRegistry: ISettingEditorRegistry;
}

interface IInputProps {
  handleChange: (value: any) => void;
  value?: any;
  uihints: any;
}

const RESET_BUTTON_TEXT = 'Restore to Defaults';

export class SettingsMetadataEditor extends MetadataEditor {
  _settings: ISettingRegistry.IPlugin;
  _registry: Settings;
  _settingRegistry: ISettingRegistry;
  _editorRegistry: ISettingEditorRegistry;
  defaultMetadata: any;
  id: string;

  constructor(options: IProps) {
    super(options);
    this._settings = options.settings;
    this.id = options.settings.id;
    this.handleChange = this.handleChange.bind(this);
    options.editorRegistry.addRenderer('textinput', this.renderTextInput);
    options.editorRegistry.addRenderer('number', this.renderTextInput);
    options.editorRegistry.addRenderer('integer', this.renderTextInput);
    options.editorRegistry.addRenderer('string', this.renderTextInput);
    options.editorRegistry.addRenderer('dropdown', this.renderDropdown);
    options.editorRegistry.addRenderer('boolean', this.renderCheckbox);
    options.editorRegistry.addRenderer('array', this.renderStringArray);
    this._settingRegistry = options.registry;
    this._editorRegistry = options.editorRegistry;

    void this.initializeMetadata();
  }

  renderDropdown(props: IInputProps): any {
    return (
      <DropDown
        label={props.uihints.title}
        key={`${props.uihints.title?.replace(' ', '')}DropDown`}
        description={props.uihints.description}
        defaultError={props.uihints.error ?? ''}
        placeholder={props.uihints.placeholder}
        defaultValue={props.uihints.default}
        readonly={props.uihints.enum !== undefined}
        initialValue={props.value}
        options={props.uihints.enum}
        onChange={(value: any): void => {
          props.handleChange(value);
        }}
      />
    );
  }

  renderTextInput(props: IInputProps): any {
    return (
      <TextInput
        label={props.uihints.title}
        description={props.uihints.description}
        key={`${props.uihints.title?.replace(' ', '')}TextInput`}
        fieldName={props.uihints.title?.replace(' ', '')}
        numeric={props.uihints.field_type === 'number'}
        defaultValue={props.value || props.uihints.default || ''}
        secure={props.uihints.secure}
        defaultError={props.uihints.error}
        placeholder={props.uihints.placeholder}
        onChange={(value: any): void => {
          props.handleChange(value);
        }}
      />
    );
  }

  renderCheckbox(props: IInputProps): any {
    return (
      <div
        className="jp-metadataEditor-formInput"
        key={`${props.uihints.title?.replace(' ', '')}BooleanInput`}
      >
        <FormControlLabel
          className="jp-metadataEditor-formInput"
          key={`${props.uihints.title?.replace(' ', '')}BooleanInput`}
          control={
            <Checkbox
              checked={props.value}
              onChange={(e: any, checked: boolean) => {
                props.handleChange(checked);
              }}
            />
          }
          label={props.uihints.title}
        />
      </div>
    );
  }

  renderStringArray(props: IInputProps): any {
    return (
      <div
        className="jp-metadataEditor-formInput"
        key={`${props.uihints.title?.replace(' ', '')}Array`}
        style={{ flexBasis: '100%' }}
      >
        <InputLabel> {props.uihints.title} </InputLabel>
        <ArrayInput
          onChange={(values: string[]) => {
            props.handleChange(values);
          }}
          values={props.value ?? ([] as string[])}
        />
      </div>
    );
  }

  get settings(): Settings {
    return this._registry;
  }
  set settings(newSettings: Settings) {
    this._registry = newSettings;
    this.updateResetButton();
  }

  updateResetButton(): void {
    if (this._registry?.modifiedFields?.length > 0) {
      this.resetButtonText = RESET_BUTTON_TEXT;
    } else {
      this.resetButtonText = undefined;
    }
    this.update();
  }

  reset(): void {
    for (const field of this._registry.modifiedFields) {
      void this._registry.remove(field);
    }
    this.update();
  }

  handleChange(fieldName: string, value: any): void {
    this.metadata[fieldName] = value;
    void this.saveMetadata();
    this.update();
  }

  renderField(fieldName: string): React.ReactNode {
    let uihints = this.schema[fieldName].uihints;
    uihints = {
      ...this.schema[fieldName],
      ...uihints
    };
    return this._editorRegistry.getRenderer(uihints.field_type ?? 'string')?.({
      value: this.metadata[fieldName],
      handleChange: (value: any) => {
        this.handleChange(fieldName, value);
      },
      uihints
    });
  }

  async initializeMetadata() {
    if (!this._settings) {
      console.log('No settings');
      return;
    }
    try {
      this.metadata = JSON.parse(this._settings.raw);
    } catch {
      this.metadata = {};
    }
    this.defaultMetadata = {};
    const settings = this._settings.schema;
    const currentSettings = this.metadata;
    const properties: any = {};
    for (const prop in settings.properties) {
      let ref = settings.properties[prop]['$ref'] as string;
      if (ref) {
        ref = ref.substring(14);
      }
      const options = {
        ...settings.properties[prop],
        ...((settings.definitions as PartialJSONObject)?.[
          ref || prop
        ] as PartialJSONObject)
      };
      if (options.renderer_id) {
        properties[prop] = {
          title: options.title,
          type: options.type,
          uihints: {
            field_type: options.renderer_id
          }
        };
        this.metadata[prop] = currentSettings[prop] ?? options.default;
        this.defaultMetadata[prop] = options.default;
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
          this.metadata[subProp] =
            currentSettings[prop]?.[subProp] ??
            (options.default as any)?.[subProp];
          this.defaultMetadata[subProp] = (options.default as any)?.[subProp];
        }
      } else if (options.enum || (options.additionalProperties as any)?.enum) {
        properties[prop] = {
          title: options.title,
          enum: options.enum ?? (options.additionalProperties as any).enum,
          uihints: {
            field_type: 'dropdown'
          }
        };
        this.metadata[prop] = currentSettings[prop] ?? options.default;
        this.defaultMetadata[prop] = options.default;
      } else if (typeof options.type === 'object') {
        properties[prop] = {
          title: options.title,
          uihints: {
            field_type: 'string'
          }
        };
        this.metadata[prop] = currentSettings[prop] ?? options.default;
        this.defaultMetadata[prop] = options.default;
      } else if (options.type === 'array') {
        properties[prop] = {
          title: options.title,
          uihints: {
            field_type: options.type
          }
        };
        this.metadata[prop] = currentSettings[prop] ?? options.default;
        this.defaultMetadata[prop] = options.default;
      } else if (typeof options.default === 'object') {
        for (const subProp in options.default) {
          properties[subProp] = {
            title: subProp,
            uihints: {
              field_type: typeof (options.default as any)[subProp]
            }
          };
          this.metadata[subProp] =
            currentSettings[prop]?.[subProp] ??
            (options.default as any)?.[subProp];
          this.defaultMetadata[subProp] = (options.default as any)?.[subProp];
        }
      } else {
        properties[prop] = {
          title: options.title,
          type: options.type,
          uihints: {
            field_type: options.type
          }
        };
        this.metadata[prop] = currentSettings[prop] ?? options.default;
        this.defaultMetadata[prop] = options.default;
      }
    }
    this.schema = properties;
    this.schemaDisplayName = settings.title;

    // Find categories of all schema properties
    this.schemaPropertiesByCategory = { _noCategory: [] };
    for (const schemaProperty in this.schema) {
      const category =
        this.schema[schemaProperty].uihints &&
        this.schema[schemaProperty].uihints.category;
      if (!category) {
        this.schemaPropertiesByCategory['_noCategory'].push(schemaProperty);
      } else if (this.schemaPropertiesByCategory[category]) {
        this.schemaPropertiesByCategory[category].push(schemaProperty);
      } else {
        this.schemaPropertiesByCategory[category] = [schemaProperty];
      }
    }
    this.displayName = undefined;
    this.update();
  }

  getFormattedSettings(): string {
    const settings = this._settings.schema;
    const formattedSettings: any = {};
    for (const prop in settings.properties) {
      const options = {
        ...settings.properties[prop],
        ...((settings.definitions as PartialJSONObject)?.[
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
            this.metadata[subProp]
          ) {
            formattedSettings[prop][subProp] = parseInt(this.metadata[subProp]);
          } else if (
            (options.properties[subProp].items as any)?.type === 'number' &&
            this.metadata[subProp]
          ) {
            formattedSettings[prop][subProp] = JSON.parse(
              JSON.stringify(this.metadata[subProp])
            );
            for (const i in formattedSettings[prop][subProp]) {
              formattedSettings[prop][subProp][i] = parseInt(
                formattedSettings[prop][subProp][i]
              );
            }
          } else {
            formattedSettings[prop][subProp] = this.metadata[subProp];
          }
        }
      } else if (
        (options.type === 'number' ||
          (typeof options.type === 'object' &&
            options.type.includes('number'))) &&
        this.metadata[prop] !== null &&
        this.metadata[prop] !== undefined
      ) {
        formattedSettings[prop] = parseInt(this.metadata[prop]);
      } else {
        formattedSettings[prop] = this.metadata[prop];
      }
    }
    return JSON.stringify(formattedSettings);
  }

  getSaveButtonText(): string {
    return '';
  }

  getHeaderText(): string {
    return this.schemaDisplayName ?? '';
  }

  saveMetadata(): void {
    if (!this._registry) {
      return undefined;
    }
    if (this.hasInvalidFields()) {
      return;
    }

    void this._registry
      .save(this.getFormattedSettings())
      .then(() => {
        this.updateResetButton();
      })
      .catch(reason => {
        void showDialog({
          title: 'Validation error',
          body: reason.stack
        });
      });
  }

  hasInvalidFields(): boolean {
    this.invalidForm = false;
    if (this.displayName === null || this.displayName === '') {
      this.invalidForm = true;
    }

    const errors = this._registry.validate(this.getFormattedSettings());
    if (errors && errors.length > 0) {
      for (const error of errors) {
        const schemaField = error.dataPath.substring(1);
        this.schema[schemaField].uihints.error = error.message;
      }
      this.update();
      return true;
    } else {
      for (const schemaField in this.schema) {
        this.schema[schemaField].uihints.error = undefined;
      }
      return false;
    }
  }
}
