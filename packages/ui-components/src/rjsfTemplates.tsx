/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import {
  ArrayFieldTemplateProps,
  FieldTemplateProps,
  ObjectFieldTemplateProps,
  utils
} from '@rjsf/core';

import {
  addIcon,
  caretDownIcon,
  caretUpIcon,
  closeIcon,
  LabIcon
} from './icon';
import { ITranslator } from '@jupyterlab/translation';
import { JSONExt } from '@lumino/coreutils';
import { reduce } from '@lumino/algorithm';

/**
 * React JSON schema form templates namespace.
 */
export namespace RJSFTemplates {
  /**
   * Properties for React JSON schema form's templates factory.
   */
  export interface IProps {
    /**
     * Whether the form is compact or not.
     * Currently the compact mode is used for metadata-form,
     * and the normal mode for settings-editor.
     */
    compact?: boolean;
    /**
     * Whether to display if the current value is not the default one.
     */
    showModifiedFromDefault?: boolean;
    /**
     * Translator for button text.
     */
    translator?: ITranslator;
  }

  /**
   * Properties for React JSON schema form's field template.
   */
  export interface IFieldProps {
    /**
     * Whether to display if the current value is not the default one.
     */
    showModifiedFromDefault?: boolean;
    /**
     * Translator for button text.
     */
    translator?: ITranslator;
    /**
     * Whether the field is in compact mode or not.
     * In compact mode :
     *    - the title and description are displayed together
     *    - the input field is 100% wide (supposed to be in a tight container)
     */
    compact?: boolean;
  }

  /**
   * Properties for React JSON schema form's container template (array and object).
   */
  export interface IContainerProps {
    /**
     * Translator for button text.
     */
    translator?: ITranslator;
    /**
     * Array operation button style.
     */
    buttonStyle?: 'icons' | 'text';
    /**
     * Whether the container is in compact mode or not.
     * In compact mode the title and description are displayed more compactness.
     */
    compact?: boolean;
  }

  /**
   * Properties of the button to move an item.
   */
  export interface IMoveButtonProps {
    /**
     * Item index to move with this button.
     */
    item: ArrayFieldTemplateProps['items'][number];
    /**
     * Direction in which to move the item.
     */
    direction: 'up' | 'down';
    /**
     * Button style.
     */
    buttonStyle?: 'icons' | 'text';
    /**
     * Translator for button text.
     */
    translator?: ITranslator;
  }

  /**
   * Properties of the button to drop an item.
   */
  export interface IDropButtonProps {
    /**
     * Item index to drop with this button.
     */
    item: ArrayFieldTemplateProps['items'][number];
    /**
     * Button style.
     */
    buttonStyle?: 'icons' | 'text';
    /**
     * Translator for button text.
     */
    translator?: ITranslator;
  }

  /**
   * Properties of the button to add an item.
   */
  export interface IAddButtonProps {
    /**
     * Function to call to add an item.
     */
    onAddClick: ArrayFieldTemplateProps['onAddClick'];
    /**
     * Button style.
     */
    buttonStyle?: 'icons' | 'text';
    /**
     * Translator for button text.
     */
    translator?: ITranslator;
  }
}

/**
 * Button to move an item.
 *
 * @returns - the button as a react element.
 */
export const MoveButton = (
  props: RJSFTemplates.IMoveButtonProps
): JSX.Element => {
  const trans = props.translator?.load('jupyterlab');
  let buttonContent: JSX.Element | string;

  /**
   * Whether the button is disabled or not.
   */
  const disabled = () => {
    if (props.direction === 'up') {
      return !props.item.hasMoveUp;
    } else {
      return !props.item.hasMoveDown;
    }
  };

  if (props.buttonStyle === 'icons') {
    buttonContent = (
      <LabIcon.resolveReact
        icon={props.direction === 'up' ? caretUpIcon : caretDownIcon}
        tag="span"
        elementSize="xlarge"
        elementPosition="center"
      />
    );
  } else {
    buttonContent =
      props.direction === 'up'
        ? trans?.__('Move up') || 'Move up'
        : trans?.__('Move down') || 'Move down';
  }

  const moveTo =
    props.direction === 'up' ? props.item.index - 1 : props.item.index + 1;

  const button = (
    <button
      className="jp-mod-styled jp-mod-reject jp-ArrayOperationsButton"
      onClick={props.item.onReorderClick(props.item.index, moveTo)}
      disabled={disabled()}
    >
      {buttonContent}
    </button>
  );

  return button;
};

/**
 * Button to drop an item.
 *
 * @returns - the button as a react element.
 */
export const DropButton = (
  props: RJSFTemplates.IDropButtonProps
): JSX.Element => {
  const trans = props.translator?.load('jupyterlab');
  let buttonContent: JSX.Element | string;

  if (props.buttonStyle === 'icons') {
    buttonContent = (
      <LabIcon.resolveReact
        icon={closeIcon}
        tag="span"
        elementSize="xlarge"
        elementPosition="center"
      />
    );
  } else {
    buttonContent = trans?.__('Remove') || 'Remove';
  }

  const button = (
    <button
      className="jp-mod-styled jp-mod-warn jp-ArrayOperationsButton"
      onClick={props.item.onDropIndexClick(props.item.index)}
    >
      {buttonContent}
    </button>
  );

  return button;
};

/**
 * Button to add an item.
 *
 * @returns - the button as a react element.
 */
export const AddButton = (
  props: RJSFTemplates.IAddButtonProps
): JSX.Element => {
  const trans = props.translator?.load('jupyterlab');
  let buttonContent: JSX.Element | string;

  if (props.buttonStyle === 'icons') {
    buttonContent = (
      <LabIcon.resolveReact
        icon={addIcon}
        tag="span"
        elementSize="xlarge"
        elementPosition="center"
      />
    );
  } else {
    buttonContent = trans?.__('Add') || 'Add';
  }

  const button = (
    <button
      className="jp-mod-styled jp-mod-reject jp-ArrayOperationsButton"
      onClick={props.onAddClick}
    >
      {buttonContent}
    </button>
  );

  return button;
};

/**
 * React JSON schema form's array template.
 */
export class RJSFArrayTemplate {
  /**
   * Create a new array template object.
   *
   * @param options - the container template options.
   */
  constructor(options: RJSFTemplates.IContainerProps = {}) {
    this._translator = options.translator;
    this._buttonStyle = options.buttonStyle || 'text';
    this._compact = options.compact || false;
  }

  get template(): React.FC<ArrayFieldTemplateProps> {
    const factory = (props: ArrayFieldTemplateProps) => {
      return (
        <div className={props.className}>
          {this._compact ? (
            <div className="jp-FormGroup-compactTitle">
              <div
                className="jp-FormGroup-fieldLabel jp-FormGroup-contentItem"
                id={`${props.idSchema.$id}__title`}
              >
                {props.title || ''}
              </div>
              <div
                className="jp-FormGroup-description"
                id={`${props.idSchema.$id}-description`}
              >
                {props.schema.description || ''}
              </div>
            </div>
          ) : (
            <>
              {props.title && (
                <props.TitleField
                  title={props.title}
                  required={props.required}
                  id={`${props.idSchema.$id}-title`}
                />
              )}
              <props.DescriptionField
                id={`${props.idSchema.$id}-description`}
                description={props.schema.description ?? ''}
              />
            </>
          )}
          {props.items.map(item => {
            return (
              <div key={item.key} className={item.className}>
                {item.children}
                <div className="jp-ArrayOperations">
                  <MoveButton
                    buttonStyle={this._buttonStyle}
                    translator={this._translator}
                    item={item}
                    direction="up"
                  />
                  <MoveButton
                    buttonStyle={this._buttonStyle}
                    translator={this._translator}
                    item={item}
                    direction="down"
                  />
                  <DropButton
                    buttonStyle={this._buttonStyle}
                    translator={this._translator}
                    item={item}
                  />
                </div>
              </div>
            );
          })}
          {props.canAdd && (
            <AddButton
              onAddClick={props.onAddClick}
              buttonStyle={this._buttonStyle}
              translator={this._translator}
            />
          )}
        </div>
      );
    };
    factory.displayName = 'JupyterLabArrayTemplate';
    return factory;
  }

  private _translator: ITranslator | undefined;
  private _buttonStyle: 'icons' | 'text';
  private _compact: boolean;
}

/**
 * React JSON schema form's object template.
 */
export class RJSFObjectTemplate {
  /**
   * Create a new object template object.
   *
   * @param options - the container template options.
   */
  constructor(options: RJSFTemplates.IContainerProps = {}) {
    this._translator = options.translator;
    this._buttonStyle = options.buttonStyle || 'text';
    this._compact = options.compact || false;
  }

  get template(): React.FC<ObjectFieldTemplateProps> {
    const factory = (props: ObjectFieldTemplateProps) => {
      return (
        <fieldset id={props.idSchema.$id}>
          {this._compact ? (
            <div className="jp-FormGroup-compactTitle">
              <div
                className="jp-FormGroup-fieldLabel jp-FormGroup-contentItem"
                id={`${props.idSchema.$id}__title`}
              >
                {props.title || ''}
              </div>
              <div
                className="jp-FormGroup-description"
                id={`${props.idSchema.$id}__description`}
              >
                {props.schema.description || ''}
              </div>
            </div>
          ) : (
            <>
              {(props.title || props.uiSchema['ui:title']) && (
                <props.TitleField
                  id={`${props.idSchema.$id}__title`}
                  title={props.title || props.uiSchema['ui:title'] || ''}
                  required={props.required}
                />
              )}
              <props.DescriptionField
                id={`${props.idSchema.$id}__description`}
                description={props.schema.description ?? ''}
              />
            </>
          )}
          {props.properties.map(property => property.content)}
          {utils.canExpand(props.schema, props.uiSchema, props.formData) && (
            <AddButton
              onAddClick={props.onAddClick(props.schema)}
              buttonStyle={this._buttonStyle}
              translator={this._translator}
            />
          )}
        </fieldset>
      );
    };
    factory.displayName = 'JupyterLabObjectTemplate';
    return factory;
  }

  private _translator: ITranslator | undefined;
  private _buttonStyle: 'icons' | 'text';
  private _compact: boolean;
}

/**
 * Custom field template for React JSON-schema form.
 *
 */
export class RJSFFieldTemplate {
  /**
   * Create a new field template object.
   *
   * @param options - the field template options.
   */
  constructor(options: RJSFTemplates.IFieldProps = {}) {
    this._showModifiedFromDefault = options.showModifiedFromDefault ?? false;
    this._translator = options.translator;
    this._compact = options.compact ?? false;
  }

  get template(): React.FC<FieldTemplateProps> {
    const factory = (props: FieldTemplateProps) => {
      const trans = this._translator?.load('jupyterlab');
      let isModified = false;
      const {
        formData,
        schema,
        label,
        displayLabel,
        id,
        formContext,
        errors,
        rawErrors,
        children,
        onKeyChange,
        onDropPropertyClick
      } = props;

      const schemaIds = id.split('_');
      schemaIds.shift();
      const schemaId = schemaIds.join('.');

      if (this._showModifiedFromDefault) {
        /**
         * Determine if the field has been modified.
         * Schema Id is formatted as 'root_<field name>.<nexted field name>'
         * This logic parses out the field name to find the default value
         * before determining if the field has been modified.
         */

        let defaultValue;
        if (schemaIds.length === 1) {
          defaultValue = formContext.settings.default(schemaId);
        } else if (schemaIds.length > 1) {
          const allDefaultsForObject: any = {};
          allDefaultsForObject[schemaIds[0]] = formContext.settings.default(
            schemaIds[0]
          );
          defaultValue = reduce(
            schemaIds,
            (acc, val, i) => {
              return acc?.[val];
            },
            allDefaultsForObject
          );
        }
        isModified =
          schemaId !== '' &&
          formData !== undefined &&
          defaultValue !== undefined &&
          !schema.properties &&
          schema.type !== 'array' &&
          !JSONExt.deepEqual(formData, defaultValue);
      }

      const isRoot = schemaId === '';

      const needsDescription =
        !isRoot &&
        schema.type != 'object' &&
        id !=
          'jp-SettingsEditor-@jupyterlab/shortcuts-extension:shortcuts_shortcuts';

      // While we can implement "remove" button for array items in array template,
      // object templates do not provide a way to do this; instead we need to add
      // buttons here (and first check if the field can be removed = is additional).
      const isAdditional = schema.hasOwnProperty(
        utils.ADDITIONAL_PROPERTY_FLAG
      );

      const isItem: boolean = !(
        schema.type === 'object' || schema.type === 'array'
      );

      return (
        <div
          className={`form-group ${
            displayLabel || schema.type === 'boolean' ? 'small-field' : ''
          }`}
        >
          {
            // Only show the modified indicator if there are no errors
            isModified && !rawErrors && <div className="jp-modifiedIndicator" />
          }
          {
            // Shows a red indicator for fields that have validation errors
            rawErrors && (
              <div className="jp-modifiedIndicator jp-errorIndicator" />
            )
          }
          <div
            className={`jp-FormGroup-content ${
              this._compact
                ? 'jp-FormGroup-contentCompact'
                : 'jp-FormGroup-contentNormal'
            }`}
          >
            {isItem && displayLabel && !isRoot && label && !isAdditional ? (
              this._compact ? (
                <div className="jp-FormGroup-compactTitle">
                  <div className="jp-FormGroup-fieldLabel jp-FormGroup-contentItem">
                    {label}
                  </div>
                  {isItem && schema.description && needsDescription && (
                    <div className="jp-FormGroup-description">
                      {schema.description}
                    </div>
                  )}
                </div>
              ) : (
                <h3 className="jp-FormGroup-fieldLabel jp-FormGroup-contentItem">
                  {label}
                </h3>
              )
            ) : (
              <></>
            )}
            {isAdditional && (
              <input
                className="jp-FormGroup-contentItem jp-mod-styled"
                type="text"
                onBlur={event => onKeyChange(event.target.value)}
                defaultValue={label}
              />
            )}
            <div
              className={`${
                isRoot
                  ? 'jp-root'
                  : schema.type === 'object'
                  ? 'jp-objectFieldWrapper'
                  : schema.type === 'array'
                  ? 'jp-arrayFieldWrapper'
                  : 'jp-inputFieldWrapper jp-FormGroup-contentItem'
              }`}
            >
              {children}
            </div>
            {isAdditional && (
              <button
                className="jp-FormGroup-contentItem jp-mod-styled jp-mod-warn jp-FormGroup-removeButton"
                onClick={onDropPropertyClick(label)}
              >
                {trans?.__('Remove') || 'Remove'}
              </button>
            )}
            {!this._compact && schema.description && needsDescription && (
              <div className="jp-FormGroup-description">
                {schema.description}
              </div>
            )}
            {isModified && schema.default !== undefined && (
              <div className="jp-FormGroup-default">
                {trans?.__('Default: %1', schema.default?.toLocaleString()) ||
                  `Default: ${schema.default?.toLocaleString()}`}
              </div>
            )}
            <div className="validationErrors">{errors}</div>
          </div>
        </div>
      );
    };
    factory.displayName = 'JupyterLabFieldTemplate';
    return factory;
  }

  private _showModifiedFromDefault: boolean;
  private _translator: ITranslator | undefined;
  private _compact: boolean;
}

/**
 * A templates factory for react JSON schema form.
 * It includes a field template, an array template and an object template.
 */
export class RJSFTemplatesFactory {
  constructor(options: RJSFTemplates.IProps) {
    this._fieldTemplate = new RJSFFieldTemplate({
      showModifiedFromDefault: options.showModifiedFromDefault ?? false,
      compact: options.compact ?? false,
      translator: options.translator
    });

    this._arrayTemplate = new RJSFArrayTemplate({
      compact: options.compact ?? false,
      buttonStyle: options.compact ? 'icons' : 'text',
      translator: options.translator
    });

    this._objectTemplate = new RJSFObjectTemplate({
      compact: options.compact ?? false,
      buttonStyle: options.compact ? 'icons' : 'text',
      translator: options.translator
    });
  }

  get fieldTemplate(): React.FC<FieldTemplateProps> {
    return this._fieldTemplate.template;
  }

  get arrayTemplate(): React.FC<ArrayFieldTemplateProps> {
    return this._arrayTemplate.template;
  }

  get objectTemplate(): React.FC<ObjectFieldTemplateProps> {
    return this._objectTemplate.template;
  }

  private _fieldTemplate: RJSFFieldTemplate;
  private _arrayTemplate: RJSFArrayTemplate;
  private _objectTemplate: RJSFObjectTemplate;
}
