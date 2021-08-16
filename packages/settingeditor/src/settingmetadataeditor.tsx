import {
  DIRTY_CLASS,
  IMetadataEditorProps,
  MetadataEditor
} from '@jupyterlab/metadata';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { PartialJSONObject } from '@lumino/coreutils';
import { showDialog } from '@jupyterlab/apputils';

interface IProps extends IMetadataEditorProps {
  settings: ISettingRegistry.IPlugin;
}

export class SettingsMetadataEditor extends MetadataEditor {
  _settings: ISettingRegistry.IPlugin;
  _registry: ISettingRegistry.ISettings;
  defaultMetadata: any;
  id: string;

  constructor(options: IProps) {
    super(options);
    this._settings = options.settings;
    this.id = options.settings.id;
    void this.initializeMetadata();
  }

  get settings(): ISettingRegistry.ISettings {
    return this._registry;
  }
  set settings(newSettings: ISettingRegistry.ISettings) {
    this._registry = newSettings;
  }

  hasModifiedSettings(): boolean {
    return !!this._settings.modified;
  }

  reset(): void {
    this.metadata = this.defaultMetadata;
    this.update();
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
    this.handleDirtyState(false);
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
      if (Object.keys(options.properties ?? {}).length > 0) {
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
          title: options.title
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
    if (this.hasModifiedSettings()) {
      this.resetButtonText = 'Restore to Defaults';
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
    return 'Save';
  }

  getHeaderText(): string {
    return this.schemaDisplayName ?? '';
  }

  saveMetadata(): void {
    if (!this.dirty || !this._settings) {
      return undefined;
    }
    if (this.hasInvalidFields()) {
      return;
    }

    void this._registry
      .save(this.getFormattedSettings())
      .then(() => {
        this.handleDirtyState(false);
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

  handleDirtyState(dirty: boolean): void {
    super.handleDirtyState(dirty);
    if (
      this.dirty &&
      this.parent?.parent?.parent &&
      !this.parent?.parent?.parent?.title?.className?.includes(DIRTY_CLASS)
    ) {
      this.parent.parent.parent.title.className += DIRTY_CLASS;
    } else if (!this.dirty && this.parent?.parent?.parent) {
      this.parent.parent.parent.title.className = this.parent.parent.parent.title.className.replace(
        DIRTY_CLASS,
        ''
      );
    }

    if (this.hasModifiedSettings()) {
      this.resetButtonText = 'Restore to Defaults';
    } else {
      this.resetButtonText = undefined;
    }
    this.parent?.parent?.parent?.update();
  }
}
