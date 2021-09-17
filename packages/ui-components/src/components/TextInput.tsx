/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import * as React from 'react';
import { FormComponentRegistry } from '../FormComponentRegistry';

export const TextInput: React.FC<FormComponentRegistry.IRendererProps> = ({
  value,
  handleChange,
  uihints: { error, defaultValue, description, label, placeholder, type }
}) => {
  const numeric = type === 'number' || type === 'integer';

  return (
    <div
      className={`jp-FormComponent ${error ? 'jp-SettingEditor-error' : ''}`}
    >
      {defaultValue !== value ? (
        <div className="jp-modifiedIndicator" />
      ) : undefined}
      <div>
        <h3> {label} </h3>
        <p> {description} </p>

        <input
          onChange={(event): void => {
            const newValue = event.target.value;
            if (numeric) {
              try {
                const intValue = parseInt(newValue);
                handleChange(intValue);
              } catch {
                handleChange(newValue);
              }
            } else {
              handleChange(newValue === '' ? null : newValue);
            }
          }}
          type={numeric ? 'numeric' : 'text'}
          placeholder={placeholder}
          value={value ?? ''}
        />
        {!!error && <p className="jp-SettingEditor-errorMessage">{error}</p>}
      </div>
    </div>
  );
};
