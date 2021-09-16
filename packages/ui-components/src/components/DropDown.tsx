/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as React from 'react';
import { FormComponentRegistry } from '../FormComponentRegistry';

const DROPDOWN_ITEM_CLASS = 'jp-form-DropDown-item';

export interface IDropDownProps {
  defaultError: string;
  defaultValue?: string;
  options?: string[];
  label: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  readonly?: boolean;
}

export const DropDown: React.FC<FormComponentRegistry.IRendererProps> = ({
  value,
  handleChange,
  uihints: { defaultError, options, label, description }
}) => {
  const [error, setError] = React.useState(defaultError);
  const [updatedValue, setValue] = React.useState(value);

  // This is necessary to rerender with error when clicking the save button.
  React.useEffect(() => {
    setError(defaultError);
  }, [defaultError]);

  React.useEffect(() => {
    setValue(value);
  }, [value]);

  const handleInputChange = (newValue: string): void => {
    setValue(newValue);
    handleChange(newValue);
  };

  return (
    <div
      className={`jp-metadataEditor-formInput ${DROPDOWN_ITEM_CLASS} ${
        !!error && 'jp-SettingEditor-error'
      }`}
    >
      <h3>{label}</h3>
      <p> {description} </p>
      <select
        value={updatedValue}
        onChange={(event: any): void => {
          handleInputChange(event.target.value);
        }}
      >
        {options?.map((option: string) => {
          return (
            <option
              key={`${option}MenuItem`}
              value={option}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'flex-start',
                padding: '18.5px 14px'
              }}
            >
              {option}
            </option>
          );
        })}
      </select>
      {!!error && <p>{error}</p>}
    </div>
  );
};
