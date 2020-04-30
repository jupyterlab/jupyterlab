// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import Highlight from 'react-highlighter';

import JSONTree from 'react-json-tree';

import { JSONArray, JSONObject, JSONValue, JSONExt } from '@lumino/coreutils';

import { InputGroup } from '@jupyterlab/ui-components';

/**
 * The properties for the JSON tree component.
 */
export interface IProps {
  data: NonNullable<JSONValue>;
  metadata?: JSONObject;
}

/**
 * The state of the JSON tree component.
 */
export interface IState {
  filter?: string;
  value: string;
}

/**
 * A component that renders JSON data as a collapsible tree.
 */
export class Component extends React.Component<IProps, IState> {
  state = { filter: '', value: '' };

  timer: number = 0;

  handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    this.setState({ value });
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.setState({ filter: value });
    }, 300);
  };

  render() {
    const { data, metadata } = this.props;
    const root = metadata && metadata.root ? (metadata.root as string) : 'root';
    const keyPaths = this.state.filter
      ? filterPaths(data, this.state.filter, [root])
      : [root];
    return (
      <div className="container">
        <InputGroup
          className="filter"
          type="text"
          placeholder="Filter..."
          onChange={this.handleChange}
          value={this.state.value}
          rightIcon="search"
        />
        <JSONTree
          data={data}
          collectionLimit={100}
          theme={{
            extend: theme,
            valueLabel: 'cm-variable',
            valueText: 'cm-string',
            nestedNodeItemString: 'cm-comment'
          }}
          invertTheme={false}
          keyPath={[root]}
          getItemString={(type, data, itemType, itemString) =>
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
          labelRenderer={([label, type]) => {
            // let className = 'cm-variable';
            // if (type === 'root') {
            //   className = 'cm-variable-2';
            // }
            // if (type === 'array') {
            //   className = 'cm-variable-2';
            // }
            // if (type === 'Object') {
            //   className = 'cm-variable-3';
            // }
            return (
              <span className="cm-keyword">
                <Highlight
                  search={this.state.filter}
                  matchStyle={{ backgroundColor: 'yellow' }}
                >
                  {`${label}: `}
                </Highlight>
              </span>
            );
          }}
          valueRenderer={raw => {
            let className = 'cm-string';
            if (typeof raw === 'number') {
              className = 'cm-number';
            }
            if (raw === 'true' || raw === 'false') {
              className = 'cm-keyword';
            }
            return (
              <span className={className}>
                <Highlight
                  search={this.state.filter}
                  matchStyle={{ backgroundColor: 'yellow' }}
                >
                  {`${raw}`}
                </Highlight>
              </span>
            );
          }}
          shouldExpandNode={(keyPath, data, level) =>
            metadata && metadata.expanded
              ? true
              : keyPaths.join(',').includes(keyPath.join(','))
          }
        />
      </div>
    );
  }
}

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

function objectIncludes(data: JSONValue, query: string): boolean {
  return JSON.stringify(data).includes(query);
}

function filterPaths(
  data: NonNullable<JSONValue>,
  query: string,
  parent: JSONArray = ['root']
): JSONArray {
  if (JSONExt.isArray(data)) {
    return data.reduce((result: JSONArray, item: JSONValue, index: number) => {
      if (item && typeof item === 'object' && objectIncludes(item, query)) {
        return [
          ...result,
          [index, ...parent].join(','),
          ...filterPaths(item, query, [index, ...parent])
        ];
      }
      return result;
    }, []) as JSONArray;
  }
  if (JSONExt.isObject(data)) {
    return Object.keys(data).reduce((result: JSONArray, key: string) => {
      const item = data[key];
      if (
        item &&
        typeof item === 'object' &&
        (key.includes(query) || objectIncludes(item, query))
      ) {
        return [
          ...result,
          [key, ...parent].join(','),
          ...filterPaths(item, query, [key, ...parent])
        ];
      }
      return result;
    }, []);
  }
  return [];
}
