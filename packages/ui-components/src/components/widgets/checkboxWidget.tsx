// import React from 'react';
// import {
//   ariaDescribedByIds,
//   descriptionId,
//   FormContextType,
//   getTemplate,
//   RJSFSchema,
//   schemaRequiresTrueValue,
//   StrictRJSFSchema,
//   WidgetProps
// } from '@rjsf/utils';
// import { Checkbox } from '@jupyter/react-components';

// function CustomCheckbox<
//   T = any,
//   S extends StrictRJSFSchema = RJSFSchema,
//   F extends FormContextType = any
// >({
//   schema,
//   id,
//   value,
//   disabled,
//   readonly,
//   label = '',
//   hideLabel,
//   options,
//   onChange,
//   onBlur,
//   onFocus,
//   registry,
//   uiSchema,
// }: WidgetProps<T, S, F>) {
//   const DescriptionFieldTemplate = getTemplate<'DescriptionFieldTemplate', T, S, F>(
//     'DescriptionFieldTemplate',
//     registry,
//     options
//   );
//   // Because an unchecked checkbox will cause html5 validation to fail, only add
//   // the "required" attribute if the field value must be "true", due to the
//   // "const" or "enum" keywords
//   const required = schemaRequiresTrueValue<S>(schema);
//   const _onChange = ({
//     target: { checked }
//   }: React.ChangeEvent<HTMLElement & { checked: boolean }>) =>
//     onChange(checked);
//   const _onBlur = ({
//     target
//   }: React.FocusEvent<HTMLElement & { value: string }>) =>
//     onBlur(id, target && target.value);
//   const _onFocus = ({
//     target
//   }: React.FocusEvent<HTMLElement & { value: string }>) =>
//     onFocus(id, target && target.value);
//   const description = options.description ?? schema.description;

//   return (
//     <>
//       {/* TODO this is addded in rjsf/core - should I added here  */}
//       {!hideLabel && !!description && (
//         <DescriptionFieldTemplate
//           id={descriptionId<T>(id)}
//           description={description}
//           schema={schema}
//           uiSchema={uiSchema}
//           registry={registry}
//         />
//       )}
//       <Checkbox
//         id={id}
//         name={id}
//         checked={typeof value === 'undefined' ? false : Boolean(value)}
//         required={required}
//         disabled={disabled || readonly}
//         onChange={_onChange}
//         onBlur={_onBlur}
//         onFocus={_onFocus}
//         aria-describedby={ariaDescribedByIds<T>(id)}
//       >
//         {label}
//         </Checkbox>
//       </>
//   );
// }

// export const customWidgets = {
//   CheckboxWidget: CustomCheckbox,
// };

import React from 'react';

import {
  ariaDescribedByIds,
  descriptionId,
  FormContextType,
  getTemplate,
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
  options,
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
  const DescriptionFieldTemplate = getTemplate<
    'DescriptionFieldTemplate',
    T,
    S,
    F
  >('DescriptionFieldTemplate', registry, options);

  console.log('CustomCheckboxWidget', hideLabel, label);
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

  const description = options?.description ?? schema?.description;

  return (
    <>
      {/* TODO this is added in rjsf/core - should we add here */}
      {!hideLabel && !!description && (
        <DescriptionFieldTemplate
          id={descriptionId<T>(id)}
          description={description}
          schema={schema}
          uiSchema={uiSchema}
          registry={registry}
        />
      )}
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
        // TODO this label is not working
        label={hideLabel ? '' : label}
      >
        <span slot="label">{label}</span>
      </Checkbox>
    </>
  );
}













