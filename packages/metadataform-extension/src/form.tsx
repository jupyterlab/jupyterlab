import { ReactWidget } from '@jupyterlab/apputils';
import React from 'react';
import Form, {
  ArrayFieldTemplateProps,
  FieldTemplateProps,
  IChangeEvent,
  ObjectFieldTemplateProps
} from '@rjsf/core';
import { JSONSchema7 } from 'json-schema';
import {
  PartialJSONObject,
  PartialJSONValue,
  ReadonlyPartialJSONObject
} from '@lumino/coreutils';
import { ITranslator } from '@jupyterlab/translation';

import { MetadataFormWidget } from './index';
import {
  addIcon,
  caretDownIcon,
  caretUpIcon,
  closeIcon,
  LabIcon
} from '@jupyterlab/ui-components';

export namespace MetadataForm {
  export interface IProperties {
    type: string;
    properties: { [metadataKey: string]: PartialJSONObject };
  }

  export interface IMetadataKeys {
    [metadataKey: string]: Array<string>;
  }

  /**
   * RJSF ui:schema.
   */
  export interface IUiSchema {
    [metadataKey: string]: IUiSchemaOption;
  }

  /**
   * RJSF ui:schema options.
   */
  export interface IUiSchemaOption {
    [option: string]: any;
  }

  /**
   * Default values
   */
  export interface IDefaultValues {
    [metadataKey: string]: any;
  }

  /**
   * Props passed to the FormWidget component
   */
  export interface IProps {
    /**
     * Properties defined from the settings.
     */
    properties: IProperties;

    /**
     *  Metadata keys associated to properties.
     */
    metadataKeys: IMetadataKeys;

    /**
     * Current data of the form.
     */
    formData: ReadonlyPartialJSONObject | null;

    // /**
    //  *  Errors on the form.
    //  */
    // errors?: {[keyError: string]: {__errors: string}};

    /**
     * Translator object
     */
    translator: ITranslator | null;

    /**
     * The parent object of the form.
     */
    parent: MetadataFormWidget;

    /**
     * The uiSchema built when loading schemas.
     */
    uiSchema: IUiSchema;

    /**
     * The default values for each key.
     */
    defaultValues: IDefaultValues;
  }

  /**
   * Template to allow for custom buttons to re-order/remove entries in an array.
   */
  export const CustomArrayTemplateFactory =
    (): React.FC<ArrayFieldTemplateProps> => {
      const factory = (props: ArrayFieldTemplateProps) => {
        return (
          <div className={props.className}>
            <div className="jp-FormGroup-title">
              <div className="jp-FormGroup-fieldLabel jp-FormGroup-contentItem">
                {props.title}
              </div>
              <div className="jp-FormGroup-description">
                {' '}
                {props.schema.description}{' '}
              </div>
            </div>
            {props.items.map(item => {
              return (
                <div key={item.key} className={item.className}>
                  {item.children}
                  <div className="jp-ArrayOperations">
                    <button
                      className="jp-mod-styled"
                      onClick={item.onReorderClick(item.index, item.index - 1)}
                      disabled={!item.hasMoveUp}
                    >
                      <LabIcon.resolveReact
                        icon={caretUpIcon}
                        className="jp-ToolbarButtonComponent-icon"
                        tag="span"
                        elementSize="xlarge"
                        elementPosition="center"
                      />
                    </button>
                    <button
                      className="jp-mod-styled"
                      onClick={item.onReorderClick(item.index, item.index + 1)}
                      disabled={!item.hasMoveDown}
                    >
                      <LabIcon.resolveReact
                        icon={caretDownIcon}
                        className="jp-ToolbarButtonComponent-icon"
                        tag="span"
                        elementSize="xlarge"
                        elementPosition="center"
                      />
                    </button>
                    <button
                      className="jp-mod-styled jp-mod-warn"
                      onClick={item.onDropIndexClick(item.index)}
                      disabled={!item.hasRemove}
                    >
                      <LabIcon.resolveReact
                        icon={closeIcon}
                        className="jp-ToolbarButtonComponent-icon"
                        tag="span"
                        elementSize="xlarge"
                        elementPosition="center"
                      />
                    </button>
                  </div>
                </div>
              );
            })}
            {props.canAdd && (
              <button
                className="jp-mod-styled jp-mod-accept"
                onClick={props.onAddClick}
              >
                <LabIcon.resolveReact
                  icon={addIcon}
                  className="jp-ToolbarButtonComponent-icon"
                  tag="span"
                  elementSize="xlarge"
                  elementPosition="center"
                />
              </button>
            )}
          </div>
        );
      };
      factory.displayName = 'JupyterLabArrayTemplate';
      return factory;
    };

  /**
   * Template with custom label.
   */
  export const CustomObjectTemplateFactory =
    (): React.FC<ObjectFieldTemplateProps> => {
      const factory = (props: ObjectFieldTemplateProps) => {
        return (
          <fieldset id={props.idSchema.$id}>
            <div className="jp-FormGroup-title">
              <div className="jp-FormGroup-fieldLabel jp-FormGroup-contentItem">
                {props.title || props.uiSchema['ui:title']}
              </div>
              <div className="jp-FormGroup-description">
                {props.schema.description}
              </div>
            </div>
            {props.properties.map(property => property.content)}
          </fieldset>
        );
      };
      factory.displayName = 'JupyterLabObjectTemplate';
      return factory;
    };

  export const CustomTemplateFactory = (): React.FC<FieldTemplateProps> => {
    const factory = (props: FieldTemplateProps) => {
      const { schema, label, displayLabel, errors, rawErrors, children } =
        props;

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
            // Shows a red indicator for fields that have validation errors
            rawErrors && (
              <div className="jp-modifiedIndicator jp-errorIndicator" />
            )
          }
          <div className="jp-FormGroup-content">
            {isItem && (
              <div className="jp-FormGroup-title">
                {displayLabel && label && (
                  <div className="jp-FormGroup-fieldLabel jp-FormGroup-contentItem">
                    {label}
                  </div>
                )}
                {schema.description && (
                  <div className="jp-FormGroup-description">
                    {' '}
                    {schema.description}{' '}
                  </div>
                )}
              </div>
            )}
            <div
              className={`${
                schema.type === 'object'
                  ? 'jp-objectFieldWrapper'
                  : schema.type === 'array'
                  ? 'jp-arrayFieldWrapper'
                  : 'jp-inputFieldWrapper jp-FormGroup-contentItem'
              }`}
            >
              {children}
            </div>
            <div className="validationErrors">{errors}</div>
          </div>
        </div>
      );
    };
    factory.displayName = 'JupyterLabFieldTemplate';
    return factory;
  };
}

/**
 * A ReactWidget with the form itself.
 */
export class FormWidget extends ReactWidget {
  /**
   * Constructs a new FormWidget.
   */
  constructor(props: MetadataForm.IProps, pluginId?: string) {
    super();
    this.addClass('jp-ReactWidget');
    this._props = props;
    this.pluginId = pluginId;
  }

  public set props(newProps: MetadataForm.IProps) {
    this._props = newProps;
  }

  render(): JSX.Element {
    return (
      <Form
        schema={this._props.properties as JSONSchema7}
        formData={this._props.formData}
        FieldTemplate={MetadataForm.CustomTemplateFactory()}
        ArrayFieldTemplate={MetadataForm.CustomArrayTemplateFactory()}
        ObjectFieldTemplate={MetadataForm.CustomObjectTemplateFactory()}
        uiSchema={this._props.uiSchema}
        liveValidate
        idPrefix={`jp-MetadataForm-${this.pluginId}`}
        onChange={(e: IChangeEvent<ReadonlyPartialJSONObject>) => {
          this._props.parent.updateMetadata(
            this._props.metadataKeys,
            e.formData,
            this._props.defaultValues
          );
        }}
      />
    );
  }

  private _props: MetadataForm.IProps;
  private pluginId?: PartialJSONValue;
}
