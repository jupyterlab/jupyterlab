// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { FormComponentRegistry } from '../FormComponentRegistry';

export const CheckBox: React.FC<FormComponentRegistry.IRendererProps> = ({
  value,
  handleChange,
  uihints: { description, title, defaultValue }
}) => {
  return (
    <div
      className="jp-FormComponent jp-BooleanInput"
      key={`${title?.replace(' ', '')}BooleanInput`}
    >
      {defaultValue !== value ? (
        <div className="jp-modifiedIndicator" />
      ) : undefined}
      <div>
        <h3>{title}</h3>
        <div className="jp-InputLabelWrapper">
          <input
            type="checkbox"
            checked={value}
            onChange={(e: any) => {
              handleChange(!value);
            }}
          />
          <p
            onClick={(e: any) => {
              handleChange(!value);
            }}
          >
            {description ?? title}
          </p>
        </div>
      </div>
    </div>
  );
};
