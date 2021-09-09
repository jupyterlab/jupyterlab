import { IDictionary } from './parsing';

import { ILabStatus } from '@jupyterlab/application';
import {
  Dialog,
  IThemeManager,
  ReactWidget,
  showDialog
} from '@jupyterlab/apputils';
import { CodeEditor, IEditorServices } from '@jupyterlab/codeeditor';

import { find } from '@lumino/algorithm';
import { IDisposable } from '@lumino/disposable';
import { Message } from '@lumino/messaging';
import { Button, Link, styled } from '@material-ui/core';

import * as React from 'react';

import { MetadataService } from './metadata';
import { RequestErrors } from './RequestErrors';
import { FormEditor, TextInput } from '@jupyterlab/formeditor';
import { IFormComponentRegistry } from '../../formeditor/lib/FormComponentRegistry';

const ELYRA_METADATA_EDITOR_CLASS = 'jp-metadataEditor';
export const DIRTY_CLASS = 'jp-mod-dirty';

export interface IMetadataEditorProps {
  schema?: string;
  namespace?: string;
  name?: string;
  code?: string[];
  onSave?: () => void;
  editorServices: IEditorServices | null;
  status: ILabStatus;
  componentRegistry: IFormComponentRegistry;
  themeManager?: IThemeManager;
}

const SaveButton = styled(Button)({
  borderColor: 'var(--jp-border-color0)',
  color: 'var(--jp-ui-font-color1)',
  '&:hover': {
    borderColor: ' var(--jp-ui-font-color1)'
  }
});

/**
 * Metadata editor widget
 */
export class MetadataEditor extends ReactWidget {
  onSave?: () => void;
  editorServices: IEditorServices | null;
  status: ILabStatus;
  schemaName?: string;
  namespace?: string;
  name?: string;
  code?: string[];
  allTags: string[];
  clearDirty: IDisposable | null;
  invalidForm: boolean;
  showSecure: IDictionary<boolean>;
  widgetClass: string;
  themeManager?: IThemeManager;
  resetButtonText?: string;
  collapsed?: boolean;

  displayName?: string;
  editor?: CodeEditor.IEditor;
  schemaDisplayName?: string;
  dirty?: boolean;
  requiredFields?: string[];
  referenceURL?: string;
  language?: string;
  componentRegistry: IFormComponentRegistry;

  schema: IDictionary<any> = {};
  formSchema: FormEditor.ISchema;
  schemaPropertiesByCategory: IDictionary<string[]> = {};
  allMetadata: IDictionary<any>[] = [];
  metadata: IDictionary<any> = {};

  constructor(props: IMetadataEditorProps) {
    super();
    this.editorServices = props.editorServices;
    this.status = props.status;
    this.clearDirty = null;
    this.namespace = props.namespace;
    this.schemaName = props.schema;
    this.formSchema = {};
    this.allTags = [];
    this.onSave = props.onSave;
    this.name = props.name;
    this.code = props.code;
    this.themeManager = props.themeManager;
    this.componentRegistry = props.componentRegistry;

    this.widgetClass = `jp-metadataEditor-${this.name ? this.name : 'new'}`;
    this.addClass(this.widgetClass);

    this.handleTextInputChange = this.handleTextInputChange.bind(this);
    this.handleChangeOnTag = this.handleChangeOnTag.bind(this);
    this.handleDropdownChange = this.handleDropdownChange.bind(this);
    this.handleCheckboxChange = this.handleCheckboxChange.bind(this);

    this.invalidForm = false;

    this.showSecure = {};

    void this.initializeMetadata();
  }

  async initializeMetadata(): Promise<void> {
    try {
      if (!this.namespace) {
        return;
      }
      const schemas = await MetadataService.getSchema(this.namespace);
      for (const schema of schemas) {
        if (this.schemaName === schema.name) {
          this.schema = schema.properties.metadata.properties;
          this.referenceURL = schema.uihints?.reference_url;
          this.schemaDisplayName = schema.title;
          this.requiredFields = schema.properties.metadata.required;
          if (!this.name) {
            this.title.label = `New ${this.schemaDisplayName}`;
          }
          // Find categories of all schema properties
          for (const schemaProperty in this.schema) {
            let category =
              this.schema[schemaProperty].uihints &&
              this.schema[schemaProperty].uihints.category;
            if (!category) {
              category = '_noCategory';
            }
            this.formSchema[schemaProperty] = {
              value: this.metadata[schemaProperty],
              handleChange: (newValue: any) => {
                this.handleChange(schemaProperty, newValue);
              },
              uihints: this.schema[schemaProperty].uihints
            };
          }
          break;
        }
      }
    } catch (error) {
      void RequestErrors.serverError(error);
    }

    try {
      if (!this.namespace) {
        return;
      }
      this.allMetadata = await MetadataService.getMetadata(this.namespace);
    } catch (error) {
      void RequestErrors.serverError(error);
    }
    if (this.name) {
      for (const metadata of this.allMetadata) {
        if (metadata.metadata.tags) {
          for (const tag of metadata.metadata.tags) {
            if (!this.allTags.includes(tag)) {
              this.allTags.push(tag);
            }
          }
        } else {
          metadata.metadata.tags = [];
        }
        if (this.name === metadata.name) {
          this.metadata = metadata['metadata'];
          this.displayName = metadata['display_name'];
          this.title.label = this.displayName ?? '';
        }
      }
    } else {
      this.displayName = '';
    }

    this.update();
  }

  handleChange(fieldName: string, value: any): void {
    if (this.schema[fieldName].uihints.type === 'string') {
      this.handleTextInputChange(fieldName, value);
    }
  }

  isValueEmpty(schemaValue: any): boolean {
    return (
      schemaValue === undefined ||
      schemaValue === null ||
      schemaValue === '' ||
      (Array.isArray(schemaValue) && schemaValue.length === 0) ||
      (Array.isArray(schemaValue) &&
        schemaValue.length === 1 &&
        schemaValue[0] === '') ||
      schemaValue === '(No selection)'
    );
  }

  /**
   * Checks that all required fields have a value before submitting the form.
   * Returns false if the form is valid. Sets any invalid fields' intent to danger
   * so that the form will highlight the input(s) causing issues in red.
   */
  hasInvalidFields(): boolean {
    this.invalidForm = false;
    if (this.displayName === null || this.displayName === '') {
      this.invalidForm = true;
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

  onCloseRequest(msg: Message): void {
    if (this.dirty) {
      void showDialog({
        title: 'Close without saving?',
        body: (
          <p>
            {' '}
            {`"${this.displayName}" has unsaved changes, close without saving?`}{' '}
          </p>
        ),
        buttons: [Dialog.cancelButton(), Dialog.okButton()]
      }).then((response: any): void => {
        if (response.button.accept) {
          this.dispose();
          super.onCloseRequest(msg);
        }
      });
    } else {
      this.dispose();
      super.onCloseRequest(msg);
    }
  }

  saveMetadata(): void {
    const newMetadata: any = {
      schema_name: this.schemaName,
      display_name: this.displayName,
      metadata: this.metadata
    };

    if (this.hasInvalidFields()) {
      this.update();
      return;
    }

    if (!this.name && this.namespace) {
      MetadataService.postMetadata(this.namespace, JSON.stringify(newMetadata))
        .then((response: any): void => {
          this.handleDirtyState(false);
          this.onSave?.();
          this.close();
        })
        .catch((error: any) => RequestErrors.serverError(error));
    } else if (this.namespace && this.name) {
      MetadataService.putMetadata(
        this.namespace,
        this.name,
        JSON.stringify(newMetadata)
      )
        .then((response: any): void => {
          this.handleDirtyState(false);
          this.onSave?.();
          this.close();
        })
        .catch((error: any) => RequestErrors.serverError(error));
    }
  }

  handleTextInputChange(schemaField: string, value: string): void {
    this.handleDirtyState(true);
    // Special case because all metadata has a display name
    if (schemaField === 'display_name') {
      this.displayName = value;
    } else if (!value && !this.requiredFields?.includes(schemaField)) {
      delete this.metadata[schemaField];
    } else {
      this.metadata[schemaField] = value;
    }
  }

  handleDropdownChange = (schemaField: string, value: string): void => {
    this.handleDirtyState(true);
    this.metadata[schemaField] = value;
    if (schemaField === 'language') {
      this.language = value;
    }
    this.update();
  };

  handleCheckboxChange = (schemaField: string, value: boolean): void => {
    this.handleDirtyState(true);
    this.metadata[schemaField] = value;
    this.update();
  };

  handleDirtyState(dirty: boolean): void {
    this.dirty = dirty;
    if (this.dirty && !this.clearDirty) {
      this.clearDirty = this.status.setDirty();
    } else if (!this.dirty && this.clearDirty) {
      this.clearDirty.dispose();
      this.clearDirty = null;
    }
    if (this.dirty && !this.title.className.includes(DIRTY_CLASS)) {
      this.title.className += DIRTY_CLASS;
    } else if (!this.dirty) {
      this.title.className = this.title.className.replace(DIRTY_CLASS, '');
    }
  }

  getDefaultChoices(fieldName: string): any[] {
    let defaultChoices = this.schema[fieldName].enum;
    if (!defaultChoices) {
      defaultChoices =
        Object.assign([], this.schema[fieldName].uihints.default_choices) || [];
      for (const otherMetadata of this.allMetadata) {
        if (
          // Don't include the current metadata
          otherMetadata !== this.metadata &&
          // Don't add if otherMetadata hasn't defined field
          otherMetadata.metadata[fieldName] &&
          !find(defaultChoices, (choice: string) => {
            return (
              choice.toLowerCase() ===
              otherMetadata.metadata[fieldName].toLowerCase()
            );
          })
        ) {
          defaultChoices.push(otherMetadata.metadata[fieldName]);
        }
      }
    }
    return defaultChoices;
  }

  setFormFocus(): void {
    const isFocused = document
      .querySelector(`.${this.widgetClass}`)
      ?.contains(document.activeElement);

    if (!isFocused) {
      const input = document.querySelector(
        `.${this.widgetClass} .jp-metadataEditor-form-display_name input`
      ) as HTMLInputElement;
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  }

  onAfterShow(msg: Message): void {
    this.setFormFocus();
  }

  onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.setFormFocus();
  }

  handleChangeOnTag(selectedTags: string[], allTags: string[]): void {
    this.handleDirtyState(true);
    this.metadata.tags = selectedTags;
    this.allTags = allTags;
  }

  renderHeader(): React.ReactNode {
    let headerText = `Edit "${this.displayName}"`;
    if (!this.name) {
      headerText = `Add new ${this.schemaDisplayName}`;
    }
    return (
      <div className="jp-SettingsHeader">
        <h3> {headerText} </h3>
        {this.resetButtonText ? (
          <Button
            onClick={(e: any) => {
              this.reset();
            }}
          >
            {this.resetButtonText}
          </Button>
        ) : undefined}
      </div>
    );
  }

  renderSaveButton(): React.ReactNode {
    return (
      <div
        className={'jp-metadataEditor-formInput jp-metadataEditor-saveButton'}
        key={'SaveButton'}
      >
        <SaveButton
          variant="outlined"
          color="primary"
          onClick={(): void => {
            this.saveMetadata();
          }}
        >
          Save & Close
        </SaveButton>
      </div>
    );
  }

  reset(): void {
    this.handleDirtyState(true);
    this.metadata = {};
    this.update();
  }

  render(): React.ReactElement {
    const error =
      this.displayName === '' && this.invalidForm
        ? 'This field is required.'
        : undefined;
    const onKeyPress: React.KeyboardEventHandler = (
      event: React.KeyboardEvent
    ) => {
      const targetElement = event.nativeEvent.target as HTMLElement;
      if (event.key === 'Enter' && targetElement?.tagName !== 'TEXTAREA') {
        this.saveMetadata();
      }
    };
    return (
      <div onKeyPress={onKeyPress} className={ELYRA_METADATA_EDITOR_CLASS}>
        {this.renderHeader()}
        <p style={{ width: '100%', marginBottom: '10px' }}>
          {this.requiredFields &&
            this.requiredFields.length > 0 &&
            'All fields marked with an asterisk are required.&nbsp;'}
          {this.referenceURL ? (
            <Link
              href={this.referenceURL}
              target="_blank"
              rel="noreferrer noopener"
            >
              [Learn more ...]
            </Link>
          ) : null}
        </p>
        {this.displayName !== undefined ? (
          <TextInput
            label="Name"
            key="displayNameTextInput"
            fieldName="display_name"
            defaultValue={this.displayName}
            required={true}
            secure={false}
            defaultError={error}
            onChange={(value): void => {
              this.handleTextInputChange('display_name', value);
            }}
          />
        ) : null}
        <FormEditor
          componentRegistry={this.componentRegistry}
          schema={this.schema}
          handleChange={this.handleChange}
        />
        {this.renderSaveButton()}
      </div>
    );
  }
}
