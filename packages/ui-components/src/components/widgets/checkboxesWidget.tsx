import React, { ChangeEvent, FocusEvent } from 'react';
import { Checkbox } from '@jupyter/react-components';
import {
  ariaDescribedByIds,
  enumOptionsDeselectValue,
  enumOptionsIsSelected,
  enumOptionsSelectValue,
  enumOptionsValueForIndex,
  FormContextType,
  optionId,
  RJSFSchema,
  StrictRJSFSchema,
  WidgetProps
} from '@rjsf/utils';

/** The `CheckboxesWidget` is a widget for rendering checkbox groups.
 *  It is typically used to represent an array of enums.
 *
 * @param props - The `WidgetProps` for this component
 */
export default function CheckboxesWidget<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any
>({
  id,
  disabled,
  options,
  value,
  readonly,
  onChange,
  onBlur,
  onFocus
}: WidgetProps<T, S, F>) {
  const { enumOptions, enumDisabled, inline, emptyValue } = options;
  const checkboxesValues = Array.isArray(value) ? value : [value];

  const _onChange =
    (index: number) =>
    ({ target: { checked } }: ChangeEvent<HTMLInputElement>) => {
      if (checked) {
        onChange(
          enumOptionsSelectValue<S>(index, checkboxesValues, enumOptions)
        );
      } else {
        onChange(
          enumOptionsDeselectValue<S>(index, checkboxesValues, enumOptions)
        );
      }
    };

  const _onBlur = ({ target: { value } }: FocusEvent<HTMLInputElement>) =>
    onBlur(id, enumOptionsValueForIndex<S>(value, enumOptions, emptyValue));
  const _onFocus = ({ target: { value } }: FocusEvent<HTMLInputElement>) =>
    onFocus(id, enumOptionsValueForIndex<S>(value, enumOptions, emptyValue));

  return (
    <fieldset id={id} style={{ display: inline ? 'flex' : 'block' }}>
      {(enumOptions ?? []).map((option, index) => {
        const checked = enumOptionsIsSelected<S>(
          option.value,
          checkboxesValues
        );
        const itemDisabled = enumDisabled?.includes(option.value) || false;
        return (
          <label key={optionId(id, index)} style={{ display: 'block' }}>
            <Checkbox
              id={optionId(id, index)}
              name={id}
              checked={checked}
              disabled={disabled || itemDisabled || readonly}
              // autoFocus={autofocus && index === 0}
              onChange={_onChange(index)}
              onBlur={_onBlur}
              onFocus={_onFocus}
              aria-describedby={ariaDescribedByIds<T>(id)}
            />
            {option.label}
          </label>
        );
      })}
    </fieldset>
  );
}
