/*
 * Copyright 2018-2021 Elyra Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  TextField,
  InputAdornment,
  IconButton,
  FormHelperText,
  Tooltip,
  withStyles
} from '@material-ui/core';
import { Visibility, VisibilityOff } from '@material-ui/icons';

import * as React from 'react';

export interface ITextFieldProps {
  label: string;
  defaultValue: string;
  description?: string;
  fieldName?: string;
  required?: boolean;
  secure?: boolean;
  defaultError?: boolean;
  placeholder?: string;
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
  label,
  required,
  placeholder,
  onChange,
  fieldName
}) => {
  const [error, setError] = React.useState(defaultError);
  const [value, setValue] = React.useState(defaultValue);

  // This is necessary to rerender with error when clicking the save button.
  React.useEffect(() => {
    setError(defaultError);
  }, [defaultError]);

  const [showPassword, setShowPassword] = React.useState(false);

  const toggleShowPassword = (): void => {
    setShowPassword(!showPassword);
  };

  return (
    <div
      className={`elyra-metadataEditor-formInput ${
        secure ? 'elyra-metadataEditor-secure' : ''
      }`}
    >
      <CustomTooltip title={description ?? ''}>
        <TextField
          id={fieldName}
          label={label}
          required={required}
          variant="outlined"
          error={error}
          onChange={(event): void => {
            const newValue = event.target.value;
            setError(required && newValue === '');
            setValue(newValue);
            onChange(newValue);
          }}
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
          className={`elyra-metadataEditor-form-${fieldName ?? ''}`}
        />
      </CustomTooltip>
      {error === true && (
        <FormHelperText error>This field is required.</FormHelperText>
      )}
    </div>
  );
};
