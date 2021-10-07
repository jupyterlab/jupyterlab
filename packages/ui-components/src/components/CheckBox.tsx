// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
// import { FormComponentRegistry } from '../FormComponentRegistry';

export const CheckBox: React.FC<any> = ({ value, onChange, schema }) => {
  return (
    <div>
      <div className="jp-InputLabelWrapper">
        <input
          type="checkbox"
          checked={value ?? schema.default}
          onChange={() => onChange(!value)}
        />
        <p onClick={() => onChange(!value)}>
          {schema.description ?? schema.title}
        </p>
      </div>
    </div>
  );
};
