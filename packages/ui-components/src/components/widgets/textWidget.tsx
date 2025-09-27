/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { FocusEvent } from 'react';
import { NumberField, TextField } from '@jupyter/react-components';
import {
  ariaDescribedByIds,
  BaseInputTemplateProps,
  examplesId,
  FormContextType,
  GenericObjectType,
  getInputProps,
  RJSFSchema,
  StrictRJSFSchema
} from '@rjsf/utils';

const INPUT_STYLE = {
  width: '100%'
};

/** The `BaseInputTemplate` is the template to use to render the basic `<input>` component for the `core` theme.
 * It is used as the template for rendering many of the <input> based widgets that differ by `type` and callbacks only.
 * It can be customized/overridden for other themes or individual implementations as needed.
 *
 * @param props - The `WidgetProps` for this template
 */
export function BaseInputTemplate<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any
>(props: BaseInputTemplateProps<T, S, F>) {
  const {
    disabled,
    formContext,
    id,
    onBlur,
    onChange,
    onChangeOverride,
    onFocus,
    options,
    placeholder,
    readonly,
    schema,
    value,
    type
  } = props;

  const inputProps = getInputProps<T, S, F>(schema, type, options, false);
  const { type: type_, step, ...otherProps } = inputProps;
  const { readonlyAsDisabled = true } = formContext as GenericObjectType;

  const handleNumberChange = (event: CustomEvent) => {
    if (event.detail.valueAsNumber !== undefined) {
      onChange(event.detail.valueAsNumber);
    }
  };

  const handleTextChange = onChangeOverride
    ? (onChangeOverride as any)
    : (event: CustomEvent) => {
        const textValue =
          event.detail.value === '' ? options.emptyValue : event.detail.value;
        onChange(textValue);
      };

  const handleBlur = ({ target }: FocusEvent<HTMLInputElement>) => {
    onBlur(id, target?.value);
  };

  const handleFocus = ({ target }: FocusEvent<HTMLInputElement>) => {
    onFocus(id, target?.value);
  };

  const input =
    inputProps.type === 'number' || inputProps.type === 'integer' ? (
      <NumberField
        disabled={disabled || (readonlyAsDisabled && readonly)}
        id={id}
        name={id}
        onBlur={!readonly ? handleBlur : undefined}
        onChange={!readonly ? handleNumberChange : undefined}
        onFocus={!readonly ? handleFocus : undefined}
        placeholder={placeholder}
        style={INPUT_STYLE}
        list={schema.examples ? examplesId<T>(id) : undefined}
        {...otherProps}
        step={step as any}
        value={value}
        aria-describedby={ariaDescribedByIds<T>(id, !!schema.examples)}
      />
    ) : (
      <TextField
        disabled={disabled || (readonlyAsDisabled && readonly)}
        id={id}
        name={id}
        onBlur={!readonly ? handleBlur : undefined}
        onChange={!readonly ? handleTextChange : undefined}
        onFocus={!readonly ? handleFocus : undefined}
        placeholder={placeholder}
        style={INPUT_STYLE}
        list={schema.examples ? examplesId<T>(id) : undefined}
        {...otherProps}
        type={type_ as any}
        value={value as string | undefined}
        aria-describedby={ariaDescribedByIds<T>(id, !!schema.examples)}
      />
    );

  return (
    <>
      {input}
      {Array.isArray(schema.examples) && (
        <datalist id={examplesId<T>(id)}>
          {(schema.examples as string[])
            .concat(
              schema.default && !schema.examples.includes(schema.default)
                ? ([schema.default] as string[])
                : []
            )
            .map(example => (
              <option key={example} value={example} />
            ))}
        </datalist>
      )}
    </>
  );
}
