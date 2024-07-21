import React from 'react';

import {
  ariaDescribedByIds,
  FormContextType,
  RJSFSchema,
  schemaRequiresTrueValue,
  StrictRJSFSchema,
  WidgetProps
} from '@rjsf/utils';
import { Checkbox } from '@jupyter/react-components';

export default function CustomCheckboxWidget<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any
>({
  schema,
  id,
  value,
  disabled,
  readonly,
  label,
  hideLabel,
  autofocus = false,
  onBlur,
  onFocus,
  onChange,
  uiSchema,
  registry
}: WidgetProps<T, S, F>) {
  // Because an unchecked checkbox will cause html5 validation to fail, only add
  // the "required" attribute if the field value must be "true", due to the
  // "const" or "enum" keywords
  const required = schemaRequiresTrueValue<S>(schema);
  const _onChange = ({
    target: { checked }
  }: React.ChangeEvent<HTMLElement & { checked: boolean }>) =>
    onChange(checked);
  const _onBlur = ({
    target
  }: React.FocusEvent<HTMLElement & { value: string }>) =>
    onBlur(id, target && target.value);
  const _onFocus = ({
    target
  }: React.FocusEvent<HTMLElement & { value: string }>) =>
    onFocus(id, target && target.value);

  return (
    <Checkbox
      id={id}
      name={id}
      checked={typeof value === 'undefined' ? false : Boolean(value)}
      required={required}
      disabled={disabled || readonly}
      // autoFocus={autofocus}
      onChange={_onChange}
      onBlur={_onBlur}
      onFocus={_onFocus}
      aria-describedby={ariaDescribedByIds<T>(id)}
    >
      {label}
    </Checkbox>
  );
}
