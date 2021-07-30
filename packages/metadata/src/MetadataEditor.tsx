/*
 * Copyright 2018-2021 Elyra Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { MetadataService, IDictionary } from '@elyra/services';
import {
  DropDown,
  ThemeProvider,
  RequestErrors,
  TextInput
} from '@elyra/ui-components';

import { ILabStatus } from '@jupyterlab/application';
import {
  ReactWidget,
  showDialog,
  Dialog,
  IThemeManager
} from '@jupyterlab/apputils';
import { CodeEditor, IEditorServices } from '@jupyterlab/codeeditor';

import { find } from '@lumino/algorithm';
import { IDisposable } from '@lumino/disposable';
import { Message } from '@lumino/messaging';
import {
  InputLabel,
  FormHelperText,
  Button,
  Link,
  styled
} from '@material-ui/core';

import * as React from 'react';

import { MetadataEditorTags } from './MetadataEditorTags';

const ELYRA_METADATA_EDITOR_CLASS = 'elyra-metadataEditor';
const DIRTY_CLASS = 'jp-mod-dirty';

interface IMetadataEditorProps {
  schema: string;
  namespace: string;
  name?: string;
  code?: string[];
  onSave: () => void;
  editorServices: IEditorServices | null;
  status: ILabStatus;
  themeManager?: IThemeManager;
}

interface ICodeBlockProps {
  editorServices: IEditorServices;
  defaultValue: string;
  language: string;
  onChange?: (value: string) => any;
  defaultError: boolean;
  label: string;
  required: boolean;
}

const CodeBlock: React.FC<ICodeBlockProps> = ({
  editorServices,
  defaultValue,
  language,
  onChange,
  defaultError,
  label,
  required
}) => {
  const [error, setError] = React.useState(defaultError);

  const codeBlockRef = React.useRef<HTMLDivElement>(null);
  const editorRef = React.useRef<CodeEditor.IEditor>();

  // `editorServices` should never change so make it a ref.
  const servicesRef = React.useRef(editorServices);

  // This is necessary to rerender with error when clicking the save button.
  React.useEffect(() => {
    setError(defaultError);
  }, [defaultError]);

  React.useEffect(() => {
    const handleChange = (args: any): void => {
      setError(required && args.text === '');
      onChange?.(args.text.split('\n'));
    };

    if (codeBlockRef.current !== null) {
      editorRef.current = servicesRef.current.factoryService.newInlineEditor({
        host: codeBlockRef.current,
        model: new CodeEditor.Model({
          value: defaultValue,
          mimeType: servicesRef.current.mimeTypeService.getMimeTypeByLanguage({
            name: language,
            codemirror_mode: language
          })
        })
      });
      editorRef.current?.model.value.changed.connect(handleChange);
    }

    return (): void => {
      editorRef.current?.model.value.changed.disconnect(handleChange);
    };
    // NOTE: The parent component is unstable so props change frequently causing
    // new editors to be created unnecessarily. This effect on mount should only
    // run on mount. Keep in mind this could have side effects, for example if
    // the `onChange` callback actually does change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (editorRef.current !== undefined) {
      editorRef.current.model.mimeType = servicesRef.current.mimeTypeService.getMimeTypeByLanguage(
        {
          name: language,
          codemirror_mode: language
        }
      );
    }
  }, [language]);

  return (
    <div>
      <InputLabel error={error} required={required}>
        {label}
      </InputLabel>
      <div ref={codeBlockRef} className="elyra-form-code" />
      {error === true && (
        <FormHelperText error>This field is required.</FormHelperText>
      )}
    </div>
  );
};

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
  onSave: () => void;
  editorServices: IEditorServices | null;
  status: ILabStatus;
  schemaName: string;
  namespace: string;
  name?: string;
  code?: string[];
  allTags: string[];
  clearDirty: IDisposable | null;
  invalidForm: boolean;
  showSecure: IDictionary<boolean>;
  widgetClass: string;
  themeManager?: IThemeManager;

  displayName?: string;
  editor?: CodeEditor.IEditor;
  schemaDisplayName?: string;
  dirty?: boolean;
  requiredFields?: string[];
  referenceURL?: string;
  language?: string;

  schema: IDictionary<any> = {};
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
    this.allTags = [];
    this.onSave = props.onSave;
    this.name = props.name;
    this.code = props.code;
    this.themeManager = props.themeManager;

    this.widgetClass = `elyra-metadataEditor-${this.name ? this.name : 'new'}`;
    this.addClass(this.widgetClass);

    this.handleTextInputChange = this.handleTextInputChange.bind(this);
    this.handleChangeOnTag = this.handleChangeOnTag.bind(this);
    this.handleDropdownChange = this.handleDropdownChange.bind(this);
    this.renderField = this.renderField.bind(this);

    this.invalidForm = false;

    this.showSecure = {};

    this.initializeMetadata();
  }

  async initializeMetadata(): Promise<void> {
    try {
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
          this.schemaPropertiesByCategory = { _noCategory: [] };
          for (const schemaProperty in this.schema) {
            const category =
              this.schema[schemaProperty].uihints &&
              this.schema[schemaProperty].uihints.category;
            if (!category) {
              this.schemaPropertiesByCategory['_noCategory'].push(
                schemaProperty
              );
            } else if (this.schemaPropertiesByCategory[category]) {
              this.schemaPropertiesByCategory[category].push(schemaProperty);
            } else {
              this.schemaPropertiesByCategory[category] = [schemaProperty];
            }
          }
          break;
        }
      }
    } catch (error) {
      RequestErrors.serverError(error);
    }

    try {
      this.allMetadata = await MetadataService.getMetadata(this.namespace);
    } catch (error) {
      RequestErrors.serverError(error);
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

  private isValueEmpty(schemaValue: any): boolean {
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
      showDialog({
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

    if (!this.name) {
      MetadataService.postMetadata(this.namespace, JSON.stringify(newMetadata))
        .then((response: any): void => {
          this.handleDirtyState(false);
          this.onSave();
          this.close();
        })
        .catch(error => RequestErrors.serverError(error));
    } else {
      MetadataService.putMetadata(
        this.namespace,
        this.name,
        JSON.stringify(newMetadata)
      )
        .then((response: any): void => {
          this.handleDirtyState(false);
          this.onSave();
          this.close();
        })
        .catch(error => RequestErrors.serverError(error));
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
        `.${this.widgetClass} .elyra-metadataEditor-form-display_name input`
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

  renderField(fieldName: string): React.ReactNode {
    let uihints = this.schema[fieldName].uihints;
    const required =
      this.requiredFields && this.requiredFields.includes(fieldName);
    const defaultValue = this.schema[fieldName].default || '';
    if (uihints === undefined) {
      uihints = {};
      this.schema[fieldName].uihints = uihints;
    }
    if (
      uihints.field_type === 'textinput' ||
      uihints.field_type === undefined
    ) {
      return (
        <TextInput
          label={this.schema[fieldName].title}
          description={this.schema[fieldName].description}
          key={`${fieldName}TextInput`}
          fieldName={fieldName}
          defaultValue={this.metadata[fieldName] || defaultValue}
          required={required}
          secure={uihints.secure}
          defaultError={uihints.error}
          placeholder={uihints.placeholder}
          onChange={(value): void => {
            this.handleTextInputChange(fieldName, value);
          }}
        />
      );
    } else if (uihints.field_type === 'dropdown') {
      return (
        <DropDown
          label={this.schema[fieldName].title}
          key={`${fieldName}DropDown`}
          description={this.schema[fieldName].description}
          required={required}
          defaultError={uihints.error}
          placeholder={uihints.placeholder}
          defaultValue={this.schema[fieldName].default}
          readonly={this.schema[fieldName].enum !== undefined}
          initialValue={this.metadata[fieldName]}
          options={this.getDefaultChoices(fieldName)}
          onChange={(value): void => {
            this.handleDropdownChange(fieldName, value);
          }}
        />
      );
    } else if (uihints.field_type === 'code') {
      let initialCodeValue = '';
      if (this.name) {
        initialCodeValue = this.metadata.code.join('\n');
      } else if (this.code) {
        this.metadata.code = this.code;
        initialCodeValue = this.code.join('\n');
      }

      return (
        <div
          className={'elyra-metadataEditor-formInput elyra-metadataEditor-code'}
          key={`${fieldName}CodeEditor`}
        >
          {this.editorServices !== null && (
            <CodeBlock
              editorServices={this.editorServices}
              language={this.language ?? this.metadata.language}
              defaultValue={initialCodeValue}
              onChange={(value): void => {
                this.metadata.code = value;
                this.handleDirtyState(true);
                return;
              }}
              defaultError={uihints.error}
              required={required ?? false}
              label={this.schema[fieldName].title}
            />
          )}
        </div>
      );
    } else if (uihints.field_type === 'tags') {
      return (
        <div
          className="elyra-metadataEditor-formInput"
          key={`${fieldName}TagList`}
        >
          <InputLabel> Tags </InputLabel>
          <MetadataEditorTags
            selectedTags={this.metadata.tags}
            tags={this.allTags}
            handleChange={this.handleChangeOnTag}
          />
        </div>
      );
    } else {
      return null;
    }
  }

  handleChangeOnTag(selectedTags: string[], allTags: string[]): void {
    this.handleDirtyState(true);
    this.metadata.tags = selectedTags;
    this.allTags = allTags;
  }

  render(): React.ReactElement {
    const inputElements = [];
    for (const category in this.schemaPropertiesByCategory) {
      if (category !== '_noCategory') {
        inputElements.push(
          <h4
            style={{ flexBasis: '100%', padding: '10px' }}
            key={`${category}Category`}
          >
            {category}
          </h4>
        );
      }
      for (const schemaProperty of this.schemaPropertiesByCategory[category]) {
        inputElements.push(this.renderField(schemaProperty));
      }
    }
    let headerText = `Edit "${this.displayName}"`;
    if (!this.name) {
      headerText = `Add new ${this.schemaDisplayName}`;
    }
    const error = this.displayName === '' && this.invalidForm;
    const onKeyPress: React.KeyboardEventHandler = (
      event: React.KeyboardEvent
    ) => {
      const targetElement = event.nativeEvent.target as HTMLElement;
      if (event.key === 'Enter' && targetElement?.tagName !== 'TEXTAREA') {
        this.saveMetadata();
      }
    };
    return (
      <ThemeProvider themeManager={this.themeManager}>
        <div onKeyPress={onKeyPress} className={ELYRA_METADATA_EDITOR_CLASS}>
          <h3> {headerText} </h3>
          <p style={{ width: '100%', marginBottom: '10px' }}>
            All fields marked with an asterisk are required.&nbsp;
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
          {inputElements}
          <div
            className={
              'elyra-metadataEditor-formInput elyra-metadataEditor-saveButton'
            }
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
        </div>
      </ThemeProvider>
    );
  }
}
