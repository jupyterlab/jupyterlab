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

import React from 'react';
import JSONTree from 'react-json-tree';

// Provide an invalid theme object (this is on purpose!) to invalidate the
// react-json-tree's inline styles that override CodeMirror CSS classes
const theme = {
  scheme: 'jupyter',
  base00: 'invalid',
  base01: 'invalid',
  base02: 'invalid',
  base03: 'invalid',
  base04: 'invalid',
  base05: 'invalid',
  base06: 'invalid',
  base07: 'invalid',
  base08: 'invalid',
  base09: 'invalid',
  base0A: 'invalid',
  base0B: 'invalid',
  base0C: 'invalid',
  base0D: 'invalid',
  base0E: 'invalid',
  base0F: 'invalid'
};

interface IProps {
  json: any;
}

/**
 * A React Component for displaying a json object
 *
 * A slimmed down copy of the `Component` class in @jupyterlab/json-extension
 */
export const JSONComponent: React.FC<IProps> = ({ json }) => (
  <JSONTree
    data={json}
    theme={{
      extend: theme,
      valueLabel: 'cm-variable',
      valueText: 'cm-string',
      nestedNodeItemString: 'cm-comment'
    }}
    invertTheme={false}
    hideRoot={true}
    getItemString={(type, data, itemType, itemString): any =>
      Array.isArray(data) ? (
        // Always display array type and the number of items i.e. "[] 2 items".
        <span>
          {itemType} {itemString}
        </span>
      ) : Object.keys(data).length === 0 ? (
        // Only display object type when it's empty i.e. "{}".
        <span>{itemType}</span>
      ) : (
        null! // Upstream typings don't accept null, but it should be ok
      )
    }
    labelRenderer={([label, type]): any => {
      return <span className="cm-keyword">{`${label}: `}</span>;
    }}
    valueRenderer={(raw): any => {
      let className = 'cm-string';
      if (typeof raw === 'number') {
        className = 'cm-number';
      }
      if (raw === 'true' || raw === 'false') {
        className = 'cm-keyword';
      }
      return <span className={className}>{`${raw}`}</span>;
    }}
  />
);
