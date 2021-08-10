import { DIRTY_CLASS, MetadataEditor } from '@jupyterlab/metadata';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { PartialJSONObject } from '@lumino/coreutils';
import { showDialog } from '@jupyterlab/apputils';

export class SettingsMetadataEditor extends MetadataEditor {
  _settings: ISettingRegistry.ISettings;

  constructor(options: any) {
    super(options);
  }

  get settings(): any {
    return this._settings;
  }
  set settings(newSettings: any) {
    this._settings = newSettings;
    void this.initializeMetadata();
  }

  async initializeMetadata() {
    if (!this._settings) {
      console.log('No settings');
      return;
    }
    try {
      this.metadata = JSON.parse(this.settings.raw);
    } catch {
      this.metadata = {};
    }
    this.handleDirtyState(false);
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
        }
      } else if ((options.additionalProperties as any)?.enum) {
        properties[prop] = {
          title: options.title,
          enum: (options.additionalProperties as any).enum,
          uihints: {
            field_type: 'dropdown'
          }
        };
        this.metadata[prop] = currentSettings[prop] ?? options.default;
      } else if (typeof options.type === 'object') {
        properties[prop] = {
          title: options.title
        };
        this.metadata[prop] = currentSettings[prop] ?? options.default;
      } else if (options.type === 'array') {
        properties[prop] = {
          title: options.title,
          uihints: {
            field_type: options.type
          }
        };
        this.metadata[prop] = currentSettings[prop] ?? options.default;
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
      }
    }
    this.schema = properties;
    this.schemaDisplayName = settings.description;

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
    const formattedSettings = this.getFormattedSettings();

    void this._settings
      .save(formattedSettings)
      .then(() => {
        this.handleDirtyState(false);
        this.onSave();
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

    const errors = this._settings.validate(this.getFormattedSettings());
    console.log(errors);
    if (errors && errors.length > 0) {
      void showDialog({
        title: 'Error validating',
        body: JSON.stringify(errors, null, '\t')
      });
      return true;
    } else {
      return false;
    }
    for (const schemaField in this.schema) {
      const value =
        this.metadata[schemaField] || this.schema[schemaField].default;
      if (
        this.requiredFields?.includes(schemaField) &&
        this.isValueEmpty(value)
      ) {
        this.invalidForm = true;
        this.schema[schemaField].uihints.error = true;
      } else {
        this.schema[schemaField].uihints.error = false;
      }
    }
    return this.invalidForm;
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
    this.parent?.parent?.parent?.update();
  }
}
