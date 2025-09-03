/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { JSONExt, ReadonlyJSONObject } from '@lumino/coreutils';

import Form, { FormProps, IChangeEvent } from '@rjsf/core';

import {
  ADDITIONAL_PROPERTY_FLAG,
  ArrayFieldTemplateProps,
  canExpand,
  FieldTemplateProps,
  getTemplate,
  ObjectFieldTemplateProps,
  Registry,
  UiSchema
} from '@rjsf/utils';

import React from 'react';
import {
  addIcon,
  caretDownIcon,
  caretUpIcon,
  closeIcon,
  LabIcon
} from '../icon';

/**
 * Default `ui:options` for the UiSchema.
 */
export const DEFAULT_UI_OPTIONS = {
  /**
   * This prevents the submit button from being rendered, by default, as it is
   * almost never what is wanted.
   *
   * Provide any `uiSchema#/ui:options/submitButtonOptions` to override this.
   */
  submitButtonOptions: {
    norender: true
  }
};

/**
 * Form component namespace.
 */
export namespace FormComponent {
  export interface IButtonProps {
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
   * Properties for React JSON schema form's container template (array and object).
   */
  export interface ILabCustomizerProps extends IButtonProps {
    /**
     * Whether the container is in compact mode or not.
     * In compact mode the title and description are displayed more compactness.
     */
    compact?: boolean;
    /**
     * Whether to display if the current value is not the default one.
     */
    showModifiedFromDefault?: boolean;
  }

  /**
   * Properties of the button to move an item.
   */
  export interface IMoveButtonProps extends IButtonProps {
    /**
     * Item index to move with this button.
     */
    item: ArrayFieldTemplateProps['items'][number];
    /**
     * Direction in which to move the item.
     */
    direction: 'up' | 'down';
  }

  /**
   * Properties of the button to drop an item.
   */
  export interface IDropButtonProps extends IButtonProps {
    /**
     * Item index to drop with this button.
     */
    item: ArrayFieldTemplateProps['items'][number];
  }

  /**
   * Properties of the button to add an item.
   */
  export interface IAddButtonProps extends IButtonProps {
    /**
     * Function to call to add an item.
     */
    onAddClick: ArrayFieldTemplateProps['onAddClick'];
  }
}
/**
 * Button to move an item.
 *
 * @returns - the button as a react element.
 */
export const MoveButton = (
  props: FormComponent.IMoveButtonProps
): JSX.Element => {
  const trans = (props.translator ?? nullTranslator).load('jupyterlab');
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
    const iconProps: LabIcon.IReactProps = {
      tag: 'span',
      elementSize: 'xlarge',
      elementPosition: 'center'
    };
    buttonContent =
      props.direction === 'up' ? (
        <caretUpIcon.react {...iconProps}></caretUpIcon.react>
      ) : (
        <caretDownIcon.react {...iconProps}></caretDownIcon.react>
      );
  } else {
    buttonContent =
      props.direction === 'up' ? trans.__('Move up') : trans.__('Move down');
  }

  const moveTo =
    props.direction === 'up' ? props.item.index - 1 : props.item.index + 1;

  return (
    <button
      className="jp-mod-styled jp-mod-reject jp-ArrayOperationsButton"
      onClick={props.item.onReorderClick(props.item.index, moveTo)}
      disabled={disabled()}
    >
      {buttonContent}
    </button>
  );
};

/**
 * Button to drop an item.
 *
 * @returns - the button as a react element.
 */
export const DropButton = (
  props: FormComponent.IDropButtonProps
): JSX.Element => {
  const trans = (props.translator ?? nullTranslator).load('jupyterlab');
  let buttonContent: JSX.Element | string;

  if (props.buttonStyle === 'icons') {
    buttonContent = (
      <closeIcon.react
        tag="span"
        elementSize="xlarge"
        elementPosition="center"
      />
    );
  } else {
    buttonContent = trans.__('Remove');
  }

  return (
    <button
      className="jp-mod-styled jp-mod-warn jp-ArrayOperationsButton"
      onClick={props.item.onDropIndexClick(props.item.index)}
    >
      {buttonContent}
    </button>
  );
};

/**
 * Button to add an item.
 *
 * @returns - the button as a react element.
 */
export const AddButton = (
  props: FormComponent.IAddButtonProps
): JSX.Element => {
  const trans = (props.translator ?? nullTranslator).load('jupyterlab');
  let buttonContent: JSX.Element | string;

  if (props.buttonStyle === 'icons') {
    buttonContent = (
      <addIcon.react tag="span" elementSize="xlarge" elementPosition="center" />
    );
  } else {
    buttonContent = trans.__('Add');
  }

  return (
    <button
      className="jp-mod-styled jp-mod-reject jp-ArrayOperationsButton"
      onClick={props.onAddClick}
    >
      {buttonContent}
    </button>
  );
};

export interface ILabCustomizerOptions<P>
  extends FormComponent.ILabCustomizerProps {
  name?: string;
  component: React.FunctionComponent<
    P & Required<FormComponent.ILabCustomizerProps>
  >;
}

function customizeForLab<P = any>(
  options: ILabCustomizerOptions<P>
): React.FunctionComponent<P> {
  const {
    component,
    name,
    buttonStyle,
    compact,
    showModifiedFromDefault,
    translator
  } = options;

  const isCompact = compact ?? false;
  const button = buttonStyle ?? (isCompact ? 'icons' : 'text');

  const factory = (props: P) =>
    component({
      ...props,
      buttonStyle: button,
      compact: isCompact,
      showModifiedFromDefault: showModifiedFromDefault ?? true,
      translator: translator ?? nullTranslator
    });
  if (name) {
    factory.displayName = name;
  }
  return factory;
}

/**
 * Fetch field templates from RJSF.
 */
function getTemplates(registry: Registry, uiSchema: UiSchema | undefined) {
  const TitleField = getTemplate<'TitleFieldTemplate'>(
    'TitleFieldTemplate',
    registry,
    uiSchema
  );

  const DescriptionField = getTemplate<'DescriptionFieldTemplate'>(
    'DescriptionFieldTemplate',
    registry,
    uiSchema
  );

  return { TitleField, DescriptionField };
}

/**
 * Template to allow for custom buttons to re-order/remove entries in an array.
 * Necessary to create accessible buttons.
 */
const CustomArrayTemplateFactory = (
  options: FormComponent.ILabCustomizerProps
) =>
  customizeForLab<ArrayFieldTemplateProps>({
    ...options,
    name: 'JupyterLabArrayTemplate',
    component: props => {
      const { schema, registry, uiSchema, required } = props;
      const commonProps = { schema, registry, uiSchema, required };
      const { TitleField, DescriptionField } = getTemplates(registry, uiSchema);

      return (
        <div className={props.className}>
          {props.compact ? (
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
                <TitleField
                  {...commonProps}
                  title={props.title}
                  id={`${props.idSchema.$id}-title`}
                />
              )}
              <DescriptionField
                {...commonProps}
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
                    buttonStyle={props.buttonStyle}
                    translator={props.translator}
                    item={item}
                    direction="up"
                  />
                  <MoveButton
                    buttonStyle={props.buttonStyle}
                    translator={props.translator}
                    item={item}
                    direction="down"
                  />
                  <DropButton
                    buttonStyle={props.buttonStyle}
                    translator={props.translator}
                    item={item}
                  />
                </div>
              </div>
            );
          })}
          {props.canAdd && (
            <AddButton
              onAddClick={props.onAddClick}
              buttonStyle={props.buttonStyle}
              translator={props.translator}
            />
          )}
        </div>
      );
    }
  });

/**
 * Template with custom add button, necessary for accessibility and internationalization.
 */
const CustomObjectTemplateFactory = (
  options: FormComponent.ILabCustomizerProps
) =>
  customizeForLab<ObjectFieldTemplateProps>({
    ...options,
    name: 'JupyterLabObjectTemplate',
    component: props => {
      const { schema, registry, uiSchema, required } = props;
      const commonProps = { schema, registry, uiSchema, required };
      const { TitleField, DescriptionField } = getTemplates(registry, uiSchema);

      return (
        <fieldset id={props.idSchema.$id}>
          {props.compact ? (
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
              {(props.title ||
                (props.uiSchema || JSONExt.emptyObject)['ui:title']) && (
                <TitleField
                  {...commonProps}
                  id={`${props.idSchema.$id}__title`}
                  title={
                    props.title ||
                    `${(props.uiSchema || JSONExt.emptyObject)['ui:title']}` ||
                    ''
                  }
                />
              )}
              <DescriptionField
                {...commonProps}
                id={`${props.idSchema.$id}__description`}
                description={props.schema.description ?? ''}
              />
            </>
          )}
          {props.properties.map(property => property.content)}
          {canExpand(props.schema, props.uiSchema, props.formData) && (
            <AddButton
              onAddClick={props.onAddClick(props.schema)}
              buttonStyle={props.buttonStyle}
              translator={props.translator}
            />
          )}
        </fieldset>
      );
    }
  });

/**
 * Renders the modified indicator and errors
 */
const CustomTemplateFactory = (options: FormComponent.ILabCustomizerProps) =>
  customizeForLab<FieldTemplateProps>({
    ...options,
    name: 'JupyterLabFieldTemplate',
    component: props => {
      const trans = (props.translator ?? nullTranslator).load('jupyterlab');
      let isModified = false;
      let defaultValue: any;
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

      const { defaultFormData } = formContext;
      const schemaIds = id.split('_');
      schemaIds.shift();
      const schemaId = schemaIds.join('.');
      const isRoot = schemaId === '';

      const hasCustomField =
        schemaId === (props.uiSchema || JSONExt.emptyObject)['ui:field'];

      if (props.showModifiedFromDefault) {
        /**
         * Determine if the field has been modified.
         * Schema Id is formatted as 'root_<field name>.<nested field name>'
         * This logic parses out the field name to find the default value
         * before determining if the field has been modified.
         */

        defaultValue = schemaIds.reduce(
          (acc, key) => acc?.[key],
          defaultFormData
        );
        isModified =
          !isRoot &&
          formData !== undefined &&
          defaultValue !== undefined &&
          !schema.properties &&
          schema.type !== 'array' &&
          !JSONExt.deepEqual(formData, defaultValue);
      }

      const needsDescription =
        !isRoot &&
        schema.type != 'object' &&
        id !=
          'jp-SettingsEditor-@jupyterlab/shortcuts-extension:shortcuts_shortcuts';

      // While we can implement "remove" button for array items in array template,
      // object templates do not provide a way to do this instead we need to add
      // buttons here (and first check if the field can be removed = is additional).
      const isAdditional = schema.hasOwnProperty(ADDITIONAL_PROPERTY_FLAG);

      const isItem: boolean = !(
        schema.type === 'object' || schema.type === 'array'
      );

      return (
        <div
          className={`form-group ${
            displayLabel || schema.type === 'boolean' ? 'small-field' : ''
          }`}
        >
          {!hasCustomField &&
            (rawErrors?.length ? (
              // Shows a red indicator for fields that have validation errors
              <div className="jp-modifiedIndicator jp-errorIndicator" />
            ) : (
              // Only show the modified indicator if there are no errors
              isModified && <div className="jp-modifiedIndicator" />
            ))}
          <div
            className={`jp-FormGroup-content ${
              props.compact
                ? 'jp-FormGroup-contentCompact'
                : 'jp-FormGroup-contentNormal'
            }`}
          >
            {isItem && displayLabel && !isRoot && label && !isAdditional ? (
              props.compact ? (
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
                {trans.__('Remove')}
              </button>
            )}
            {!props.compact && schema.description && needsDescription && (
              <div className="jp-FormGroup-description">
                {schema.description}
              </div>
            )}
            {isModified &&
              defaultValue !== undefined &&
              schema.type !== 'object' && (
                <div className="jp-FormGroup-default">
                  {trans.__(
                    'Default: %1',
                    defaultValue !== null
                      ? defaultValue.toLocaleString()
                      : 'null'
                  )}
                </div>
              )}
            <div className="validationErrors">{errors}</div>
          </div>
        </div>
      );
    }
  });

/**
 * FormComponent properties
 */
export interface IFormComponentProps<T = ReadonlyJSONObject>
  extends FormProps<T>,
    FormComponent.ILabCustomizerProps {
  /**
   *
   */
  formData: T;
  /**
   *
   */
  onChange: (e: IChangeEvent<T>) => any;
  /**
   *
   */
  formContext?: unknown;
}

/**
 * Generic rjsf form component for JupyterLab UI.
 */
export function FormComponent(props: IFormComponentProps): JSX.Element {
  const {
    buttonStyle,
    compact,
    showModifiedFromDefault,
    translator,
    formContext,
    ...others
  } = props;

  const uiSchema = { ...(others.uiSchema || JSONExt.emptyObject) } as UiSchema;

  uiSchema['ui:options'] = { ...DEFAULT_UI_OPTIONS, ...uiSchema['ui:options'] };

  others.uiSchema = uiSchema;

  const { FieldTemplate, ArrayFieldTemplate, ObjectFieldTemplate } =
    props.templates || JSONExt.emptyObject;

  const customization = {
    buttonStyle,
    compact,
    showModifiedFromDefault,
    translator
  };

  const fieldTemplate = React.useMemo(
    () => FieldTemplate ?? CustomTemplateFactory(customization),
    [FieldTemplate, buttonStyle, compact, showModifiedFromDefault, translator]
  ) as React.FunctionComponent;

  const arrayTemplate = React.useMemo(
    () => ArrayFieldTemplate ?? CustomArrayTemplateFactory(customization),
    [
      ArrayFieldTemplate,
      buttonStyle,
      compact,
      showModifiedFromDefault,
      translator
    ]
  ) as React.FunctionComponent;

  const objectTemplate = React.useMemo(
    () => ObjectFieldTemplate ?? CustomObjectTemplateFactory(customization),
    [
      ObjectFieldTemplate,
      buttonStyle,
      compact,
      showModifiedFromDefault,
      translator
    ]
  ) as React.FunctionComponent;

  const templates: Record<string, React.FunctionComponent> = {
    FieldTemplate: fieldTemplate,
    ArrayFieldTemplate: arrayTemplate,
    ObjectFieldTemplate: objectTemplate
  };

  return (
    <Form templates={templates} formContext={formContext as any} {...others} />
  );
}
