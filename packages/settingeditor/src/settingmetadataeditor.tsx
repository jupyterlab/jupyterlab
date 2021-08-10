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
      this.handleDirtyState(false);
      const settings = this._settings.schema;
      const currentSettings = JSON.parse(this._settings.raw);
      const schema = {
        display_name: settings.description,
        properties: {
          metadata: {
            properties: {} as any,
            required: []
          }
        },
        required: [],
        title: settings.description,
        uihints: {
          icon: settings['jupyter.lab.setting-icon'],
          reference_url: '',
          title: settings.description
        }
      };
      for (const prop in settings.properties) {
        const options = {
          ...settings.properties[prop],
          ...((settings.definitions as PartialJSONObject)?.[
            prop
          ] as PartialJSONObject)
        };
        if (options.properties && Object.keys(options.properties).length > 0) {
          for (const subProp in options.properties) {
            const subOptions = options.properties[subProp];
            schema.properties.metadata.properties[subProp] = {
              title: subOptions.title ?? subProp,
              type: subOptions.type,
              uihints: {
                field_type: subOptions.type,
                category: options.title
              }
            };
            this.metadata[subProp] =
              currentSettings[prop]?.[subProp] ??
              (options.default as any)?.[subProp];
          }
        } else if ((options.additionalProperties as any)?.enum) {
          schema.properties.metadata.properties[prop] = {
            title: options.title,
            enum: (options.additionalProperties as any).enum,
            uihints: {
              field_type: 'dropdown'
            }
          };
          this.metadata[prop] = currentSettings[prop] ?? options.default;
        } else if (typeof options.type === 'object') {
          schema.properties.metadata.properties[prop] = {
            title: options.title
          };
          this.metadata[prop] = currentSettings[prop] ?? options.default;
        } else if (typeof options.default === 'object') {
          for (const subProp in options.default) {
            schema.properties.metadata.properties[subProp] = {
              title: subProp
            };
            this.metadata[subProp] =
              currentSettings[prop]?.[subProp] ??
              (options.default as any)?.[subProp];
          }
        } else {
          schema.properties.metadata.properties[prop] = {
            title: options.title,
            type: options.type,
            uihints: {
              field_type: options.type
            }
          };
          this.metadata[prop] = currentSettings[prop] ?? options.default;
        }
      }
      this.schema = schema.properties.metadata.properties;
      this.referenceURL = schema.uihints?.reference_url;
      this.schemaDisplayName = schema.title;
      this.requiredFields = schema.properties.metadata.required;
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
    } catch (error) {
      console.log(error);
    }
    this.displayName = undefined;

    this.update();
  }

  saveMetadata(): void {
    if (!this.dirty || !this._settings) {
      return undefined;
    }

    const settings = this._settings.schema;
    const formattedSettings: any = {};
    if (settings.properties) {
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
              options.properties[subProp].type === 'number' &&
              this.metadata[subProp]
            ) {
              formattedSettings[prop][subProp] = parseInt(
                this.metadata[subProp]
              );
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
    }

    void this._settings
      .save(JSON.stringify(formattedSettings))
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
