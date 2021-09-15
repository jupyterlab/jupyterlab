/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import * as React from 'react';

export interface ITextFieldProps {
  label: string;
  defaultValue: string;
  description?: string;
  numeric?: boolean;
  fieldName?: string;
  required?: boolean;
  secure?: boolean;
  defaultError?: string;
  placeholder?: string;
  multiline?: boolean;
  onChange: (value: string) => any;
}

export const TextInput: React.FC<ITextFieldProps> = ({
  defaultError,
  defaultValue,
  secure,
  description,
  numeric,
  label,
  required,
  placeholder,
  onChange,
  multiline,
  fieldName
}) => {
  const [error, setError] = React.useState(defaultError);
  const [value, setValue] = React.useState(
    multiline ? JSON.stringify(defaultValue, null, '\t') : defaultValue
  );

  // This is necessary to rerender with error when clicking the save button.
  React.useEffect(() => {
    setError(defaultError);
  }, [defaultError]);

  React.useEffect(() => {
    setValue(
      multiline ? JSON.stringify(defaultValue, null, '\t') : defaultValue
    );
  }, [defaultValue]);

  return (
    <div
      className={`jp-metadataEditor-formInput ${
        error ? 'jp-SettingEditor-error' : undefined
      }`}
    >
      <h3> {label} </h3>
      <p> {description} </p>
      {multiline ? (
        <textarea
          className={`jp-metadataEditor-form-${fieldName ?? ''}`}
          onChange={(event): void => {
            const newValue = event.target.value;
            if (required && newValue === '') {
              setError('This field is required.');
            }
            setValue(newValue);
            onChange(newValue);
          }}
          placeholder={placeholder}
          value={value ?? ''}
        />
      ) : (
        <input
          className={`jp-metadataEditor-form-${fieldName ?? ''}`}
          onChange={(event): void => {
            const newValue = event.target.value;
            if (required && newValue === '') {
              setError('This field is required.');
            }
            setValue(newValue);
            onChange(newValue);
          }}
          type={numeric ? 'numeric' : 'text'}
          placeholder={placeholder}
          value={value ?? ''}
        />
      )}
      {!!error && <p className="jp-SettingEditor-error">{error}</p>}
    </div>
  );
};
