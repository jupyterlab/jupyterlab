/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  FormHelperText,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  withStyles
} from '@material-ui/core';
import { Visibility, VisibilityOff } from '@material-ui/icons';

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

// TODO: we seem to reuse this a lot, we should make a component for it.
const CustomTooltip = withStyles(_theme => ({
  tooltip: {
    fontSize: 13
  }
}))(Tooltip);

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
    typeof defaultValue === 'string'
      ? defaultValue
      : JSON.stringify(defaultValue, null, '\t')
  );

  // This is necessary to rerender with error when clicking the save button.
  React.useEffect(() => {
    setError(defaultError);
  }, [defaultError]);

  React.useEffect(() => {
    setValue(
      typeof defaultValue === 'string'
        ? defaultValue
        : JSON.stringify(defaultValue, null, '\t')
    );
  }, [defaultValue]);

  const [showPassword, setShowPassword] = React.useState(false);

  const toggleShowPassword = (): void => {
    setShowPassword(!showPassword);
  };

  return (
    <div
      className={`jp-metadataEditor-formInput ${
        secure ? 'jp-metadataEditor-secure' : ''
      }`}
    >
      <CustomTooltip title={description ?? ''}>
        <TextField
          label={label}
          required={required}
          variant="outlined"
          error={!!error}
          multiline={multiline}
          maxRows={15}
          onChange={(event): void => {
            const newValue = event.target.value;
            if (required && newValue === '') {
              setError('This field is required.');
            }
            setValue(newValue);
            onChange(newValue);
          }}
          inputProps={
            numeric ? { inputMode: 'numeric', pattern: '[0-9]*' } : undefined
          }
          placeholder={placeholder}
          value={value ?? ''}
          type={showPassword || !secure ? 'text' : 'password'}
          InputProps={
            secure
              ? {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={toggleShowPassword}
                        onMouseDown={(event): void => {
                          event.preventDefault();
                        }}
                        edge="end"
                      >
                        {showPassword ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    </InputAdornment>
                  )
                }
              : {}
          }
          className={`jp-metadataEditor-form-${fieldName ?? ''}`}
        />
      </CustomTooltip>
      {!!error && <FormHelperText error>{error}</FormHelperText>}
    </div>
  );
};
