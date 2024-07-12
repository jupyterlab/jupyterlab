// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { jupyterHighlightStyle } from '@jupyterlab/codemirror';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { InputGroup } from '@jupyterlab/ui-components';
import { Tag, tags } from '@lezer/highlight';
import { JSONArray, JSONExt, JSONObject, JSONValue } from '@lumino/coreutils';
import * as React from 'react';
import Highlighter from 'react-highlight-words';
import { JSONTree } from 'react-json-tree';
import { StyleModule } from 'style-mod';

/**
 * The properties for the JSON tree component.
 */
export interface IProps {
  data: NonNullable<JSONValue>;
  metadata?: JSONObject;

  /**
   * The application language translator.
   */
  translator?: ITranslator;
  forwardedRef?: React.Ref<HTMLDivElement>;
}

/**
 * The state of the JSON tree component.
 */
export interface IState {
  filter?: string;
  value: string;
}

/**
 * Get the CodeMirror style for a given tag.
 */
function getStyle(tag: Tag): string {
  return jupyterHighlightStyle.style([tag]) ?? '';
}

/**
 * A component that renders JSON data as a collapsible tree.
 */
export class Component extends React.Component<IProps, IState> {
  state = { filter: '', value: '' };

  timer: number = 0;

  componentDidMount(): void {
    StyleModule.mount(document, jupyterHighlightStyle.module as StyleModule);
  }

  handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const { value } = event.target;
    this.setState({ value });
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.setState({ filter: value });
    }, 300);
  };

  render(): JSX.Element {
    const translator = this.props.translator || nullTranslator;
    const trans = translator.load('jupyterlab');

    const { data, metadata, forwardedRef } = this.props;
    const root = metadata && metadata.root ? (metadata.root as string) : 'root';
    const keyPaths = this.state.filter
      ? filterPaths(data, this.state.filter, [root])
      : [root];
    return (
      <div className="container" ref={forwardedRef}>
        <InputGroup
          className="filter"
          type="text"
          placeholder={trans.__('Find…')}
          onChange={this.handleChange}
          value={this.state.value}
          rightIcon="ui-components:search"
        />
        <JSONTree
          data={data}
          collectionLimit={100}
          theme={{
            extend: theme,
            valueLabel: getStyle(tags.variableName),
            valueText: getStyle(tags.string),
            nestedNodeItemString: getStyle(tags.comment)
          }}
          invertTheme={false}
          keyPath={[root]}
          getItemString={(type, data, itemType, itemString) =>
            Array.isArray(data) ? (
              // Always display array type and the number of items i.e. "[] 2 items".
              <span>
                {itemType} {itemString}
              </span>
            ) : Object.keys(data as object).length === 0 ? (
              // Only display object type when it's empty i.e. "{}".
              <span>{itemType}</span>
            ) : (
              null! // Upstream typings don't accept null, but it should be ok
            )
          }
          labelRenderer={([label, type]) => {
            return (
              <span className={getStyle(tags.keyword)}>
                <Highlighter
                  searchWords={[this.state.filter]}
                  textToHighlight={`${label}`}
                  highlightClassName="jp-mod-selected"
                ></Highlighter>
              </span>
            );
          }}
          valueRenderer={raw => {
            let className = getStyle(tags.string);
            if (typeof raw === 'number') {
              className = getStyle(tags.number);
            }
            if (raw === 'true' || raw === 'false') {
              className = getStyle(tags.keyword);
            }
            return (
              <span className={className}>
                <Highlighter
                  searchWords={[this.state.filter]}
                  textToHighlight={`${raw}`}
                  highlightClassName="jp-mod-selected"
                ></Highlighter>
              </span>
            );
          }}
          shouldExpandNodeInitially={(keyPath, data, level) =>
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
  base0F: 'invalid',
  author: 'invalid'
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
