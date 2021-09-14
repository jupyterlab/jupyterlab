/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  withStyles
} from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';

import * as React from 'react';
import { FormComponentRegistry } from './FormComponentRegistry';

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

const CustomTooltip = withStyles(_theme => ({
  tooltip: {
    fontSize: 13
  }
}))(Tooltip);

export const DropDown: React.FC<FormComponentRegistry.IRendererProps> = ({
  value,
  handleChange,
  uihints: {
    defaultError,
    defaultValue,
    options,
    label,
    description,
    required,
    placeholder,
    readonly
  }
}) => {
  const [error, setError] = React.useState(defaultError);
  const [updatedValue, setValue] = React.useState(value || defaultValue);

  // This is necessary to rerender with error when clicking the save button.
  React.useEffect(() => {
    setError(defaultError);
  }, [defaultError]);

  const handleInputChange = (newValue: string): void => {
    setValue(newValue);
    if (required && newValue === '') {
      setError('This field is required.');
    }
    handleChange(newValue);
  };

  return (
    <div className={`jp-metadataEditor-formInput ${DROPDOWN_ITEM_CLASS}`}>
      <CustomTooltip title={description ?? ''} placement="top">
        {readonly ? (
          <FormControl variant="outlined">
            <InputLabel error={!!error}>{label}</InputLabel>
            <Select
              value={updatedValue}
              label={label}
              error={!!error}
              onChange={(event: any): void => {
                handleInputChange(event.target.value);
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
            freeSolo
            key="jp-DropDown"
            options={options ?? []}
            style={{ width: 300 }}
            value={updatedValue ?? ''}
            onChange={(event: any, newValue: string | null): void => {
              handleInputChange(newValue ?? '');
            }}
            renderInput={(params): React.ReactNode => (
              <TextField
                {...params}
                label={label}
                required={required}
                error={!!error}
                onChange={(event: any): void => {
                  handleInputChange(event.target.value);
                }}
                placeholder={
                  placeholder ||
                  `Create or select ${label?.toLocaleLowerCase()}`
                }
                variant="outlined"
              />
            )}
          />
        )}
      </CustomTooltip>
      {!!error && <FormHelperText error>{error}</FormHelperText>}
    </div>
  );
};
