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
  FormHelperText,
  Tooltip,
  withStyles,
  Select,
  MenuItem,
  InputLabel,
  FormControl
} from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';

import * as React from 'react';

const DROPDOWN_ITEM_CLASS = 'elyra-form-DropDown-item';

export interface IDropDownProps {
  defaultError: boolean;
  defaultValue?: string;
  options?: string[];
  label: string;
  description?: string;
  required?: boolean;
  onChange: (value: string) => any;
  placeholder?: string;
  initialValue?: string;
  readonly?: boolean;
}

const CustomTooltip = withStyles(_theme => ({
  tooltip: {
    fontSize: 13
  }
}))(Tooltip);

export const DropDown: React.FC<IDropDownProps> = ({
  defaultError,
  defaultValue,
  options,
  label,
  description,
  required,
  onChange,
  placeholder,
  initialValue,
  readonly
}) => {
  const [error, setError] = React.useState(defaultError);
  const [value, setValue] = React.useState(initialValue || defaultValue);

  // This is necessary to rerender with error when clicking the save button.
  React.useEffect(() => {
    setError(defaultError);
  }, [defaultError]);

  const handleChange = (newValue: string): void => {
    setValue(newValue);
    setError(!!(required && newValue === ''));
    onChange(newValue);
  };

  return (
    <div className={`elyra-metadataEditor-formInput ${DROPDOWN_ITEM_CLASS}`}>
      <CustomTooltip title={description ?? ''} placement="top">
        {readonly ? (
          <FormControl variant="outlined">
            <InputLabel error={error}>{label}</InputLabel>
            <Select
              value={value}
              id={`${label}DropDown`}
              label={label}
              error={error}
              onChange={(event: any): void => {
                handleChange(event.target.value);
              }}
            >
              {options?.map((option: string) => {
                return (
                  <MenuItem
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
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        ) : (
          <Autocomplete
            id="combo-box-demo"
            freeSolo
            key="elyra-DropDown"
            options={options ?? []}
            style={{ width: 300 }}
            value={value ?? ''}
            onChange={(event: any, newValue: string | null): void => {
              handleChange(newValue ?? '');
            }}
            renderInput={(params): React.ReactNode => (
              <TextField
                {...params}
                label={label}
                required={required}
                error={error}
                onChange={(event: any): void => {
                  handleChange(event.target.value);
                }}
                placeholder={
                  placeholder || `Create or select ${label.toLocaleLowerCase()}`
                }
                variant="outlined"
              />
            )}
          />
        )}
      </CustomTooltip>
      {error === true && (
        <FormHelperText error>This field is required.</FormHelperText>
      )}
    </div>
  );
};
