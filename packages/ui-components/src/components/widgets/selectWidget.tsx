/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import {
  ariaDescribedByIds,
  enumOptionsIndexForValue,
  enumOptionsValueForIndex,
  FormContextType,
  labelValue,
  RJSFSchema,
  StrictRJSFSchema,
  WidgetProps
} from '@rjsf/utils';
import { Option, Select } from '@jupyter/react-components';

function CustomSelect<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any
  >({
  id,
  options,
  label,
  hideLabel,
  value,
  required,
  disabled,
  readonly,
  multiple = false,
  // autofocus = false,
  rawErrors = [],
  onChange,
  onBlur,
  onFocus,
  schema,
  placeholder,
}: WidgetProps<T, S, F>) {
  const { enumOptions, enumDisabled, emptyValue: optEmptyVal } = options;

  const selectedIndexes = enumOptionsIndexForValue<S>(value, enumOptions, multiple);
  let selectedIndexesAsArray: string[] = [];

  if (typeof selectedIndexes === 'string') {
    selectedIndexesAsArray = [selectedIndexes];
  } else if (Array.isArray(selectedIndexes)) {
    selectedIndexesAsArray = selectedIndexes.map((index) => String(index));
  }

  const dropdownValue = selectedIndexesAsArray
    .map((index) => (enumOptions ? enumOptions[Number(index)].label : undefined))
    .join(', ');

  const _onBlur = () => onBlur(id, selectedIndexes);
  const _onFocus = () => onFocus(id, selectedIndexes);
  const _onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = multiple
      ? Array.from(event.target.selectedOptions, option => option.value)
      : event.target.value;
    onChange(enumOptionsValueForIndex<S>(newValue, enumOptions, optEmptyVal));
  };
  const showPlaceholderOption = !multiple && schema.default === undefined;

  return (
    <label>
      {labelValue(label, hideLabel)}
      <Select
        aria-invalid={rawErrors.length > 0}
        id={id}
        // multiple={multiple}
        value={dropdownValue}
        disabled={disabled || readonly}
        // autoFocus={autofocus}
        onBlur={_onBlur}
        onFocus={_onFocus}
        onChange={_onChange}
        selectedOptions={selectedIndexesAsArray}
        aria-required={required}
        aria-describedby={ariaDescribedByIds<T>(id)}
      >
        {showPlaceholderOption && <Option value=''>{placeholder || ''}</Option>}
        {Array.isArray(enumOptions) &&
          enumOptions.map(({ value, label }, i) => {
            const disabled = enumDisabled && enumDisabled.indexOf(value) !== -1;
            return (
              <Option key={i} value={String(i)} disabled={disabled}>
                {label}
              </Option>
            );
          })}
      </Select>
      </label>
  );
}


export const customWidgets = {
  SelectWidget: CustomSelect,
};
