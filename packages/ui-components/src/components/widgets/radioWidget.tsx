/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { FocusEvent } from 'react';
import {
  ariaDescribedByIds,
  enumOptionsIsSelected,
  enumOptionsValueForIndex,
  FormContextType,
  labelValue,
  optionId,
  RJSFSchema,
  StrictRJSFSchema,
  WidgetProps
} from '@rjsf/utils';
import { Radio, RadioGroup } from '@jupyter/react-components';

/** The `RadioWidget` is a widget for rendering a radio group.
 *  It is typically used with a string property constrained with enum options.
 *
 * @param props - The `WidgetProps` for this component
 */
export function RadioWidget<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any
>({
  options,
  value,
  required,
  disabled,
  readonly,
  autofocus = false,
  label,
  hideLabel,
  onBlur,
  onFocus,
  onChange,
  id,
  ...others
}: WidgetProps<T, S, F>) {
  console.log(
    'CustomRadioWidget',
    options,
    value,
    required,
    disabled,
    readonly,
    autofocus,
    onBlur,
    onFocus,
    onChange,
    id,
    others
  );

  const { enumOptions, enumDisabled, inline, emptyValue } = options;

  const _onChange = ({ target }: CustomEvent<HTMLInputElement>) => {
    const inputTarget = target as HTMLInputElement;
    if (inputTarget !== null) {
      onChange(inputTarget.checked);
    }
  };
  const _onBlur = ({ target: { value } }: FocusEvent<HTMLInputElement>) =>
    onBlur(id, enumOptionsValueForIndex<S>(value, enumOptions, emptyValue));
  const _onFocus = ({ target: { value } }: FocusEvent<HTMLInputElement>) =>
    onFocus(id, enumOptionsValueForIndex<S>(value, enumOptions, emptyValue));

  return (
    <>
      <RadioGroup
        id={id}
        name={id}
        orientation={inline ? 'horizontal' : 'vertical'}
      >
        {labelValue(label || undefined, hideLabel)}
        {Array.isArray(enumOptions) &&
          enumOptions.map((option, index) => {
            const checked = enumOptionsIsSelected<S>(option.value, value);
            const itemDisabled =
              Array.isArray(enumDisabled) &&
              enumDisabled.indexOf(option.value) !== -1;

            const radio = (
              <Radio
                id={optionId(id, index)}
                checked={checked}
                name={id}
                value={String(index)}
                disabled={disabled || itemDisabled || readonly}
                readonly={readonly}
                onChange={_onChange}
                onBlur={_onBlur}
                onFocus={_onFocus}
                aria-describedby={ariaDescribedByIds<T>(id)}
              >
                {option.label}
              </Radio>
            );

            return radio;
          })}
      </RadioGroup>
    </>
  );
}
