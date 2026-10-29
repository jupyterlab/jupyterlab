// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { jupyterHighlightStyle } from '@jupyterlab/codemirror';
import type { ITranslator } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import { InputGroup } from '@jupyterlab/ui-components';
import type { Tag } from '@lezer/highlight';
import { tags } from '@lezer/highlight';
import type { JSONObject, JSONValue } from '@lumino/coreutils';
import { JSONExt } from '@lumino/coreutils';
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
    const matches = this.state.filter
      ? filterPaths(data, this.state.filter.toLowerCase(), [root])
      : [];
    const keyPaths = new Set<string>(
      matches.length ? [JSON.stringify([root]), ...matches] : []
    );
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
          key={this.state.filter}
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
          labelRenderer={(keyPath, nodeType, expanded, expandable) => (
            <NodeLabel
              label={`${keyPath[0]}`}
              filter={this.state.filter}
              path={JSON.stringify(keyPath)}
              expanded={expanded}
              expandable={expandable}
              onToggle={this._onToggle}
            />
          )}
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
                  autoEscape={true}
                  searchWords={[this.state.filter]}
                  textToHighlight={`${raw}`}
                  highlightClassName="jp-mod-selected"
                ></Highlighter>
              </span>
            );
          }}
          shouldExpandNodeInitially={(keyPath, data, level) => {
            const path = JSON.stringify(keyPath);
            return (
              keyPaths.has(path) ||
              (this._expanded.get(path) ??
                (level === 0 || !!metadata?.expanded))
            );
          }}
        />
      </div>
    );
  }

  private _onToggle = (path: string, expanded: boolean): void => {
    this._expanded.set(path, expanded);
  };

  /**
   * The nodes the user expanded or collapsed, by key path.
   * A new search remounts the tree, so this keeps them.
   */
  private _expanded = new Map<string, boolean>();
}

/**
 * The properties for the label of a node in the JSON tree.
 */
interface INodeLabelProps {
  label: string;
  filter: string;
  path: string;
  expanded: boolean;
  expandable: boolean;
  onToggle: (path: string, expanded: boolean) => void;
}

/**
 * The label of a node, which reports when the user expands or collapses it.
 *
 * react-json-tree has no toggle callback, and only a click changes `expanded`
 * after the node mounts.
 */
function NodeLabel(props: INodeLabelProps): JSX.Element {
  const { path, expanded, expandable, onToggle } = props;
  const previous = React.useRef(expanded);
  React.useEffect(() => {
    if (expandable && previous.current !== expanded) {
      onToggle(path, expanded);
    }
    previous.current = expanded;
  }, [path, expanded, expandable, onToggle]);
  return (
    <span className={getStyle(tags.keyword)}>
      <Highlighter
        autoEscape={true}
        searchWords={[props.filter]}
        textToHighlight={props.label}
        highlightClassName="jp-mod-selected"
      ></Highlighter>
    </span>
  );
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
  return JSON.stringify(data).toLowerCase().includes(query);
}

/**
 * Get the key paths of the nodes that contain the query.
 *
 * The query must be in lower case: the search ignores case, like `Highlighter`.
 */
function filterPaths(
  data: NonNullable<JSONValue>,
  query: string,
  parent: (string | number)[] = ['root']
): string[] {
  if (JSONExt.isArray(data)) {
    return data.reduce<string[]>((result, item, index) => {
      if (item && typeof item === 'object' && objectIncludes(item, query)) {
        return [
          ...result,
          JSON.stringify([index, ...parent]),
          ...filterPaths(item, query, [index, ...parent])
        ];
      }
      return result;
    }, []);
  }
  if (JSONExt.isObject(data)) {
    return Object.keys(data).reduce<string[]>((result, key) => {
      const item = data[key];
      if (
        item &&
        typeof item === 'object' &&
        (key.toLowerCase().includes(query) || objectIncludes(item, query))
      ) {
        return [
          ...result,
          JSON.stringify([key, ...parent]),
          ...filterPaths(item, query, [key, ...parent])
        ];
      }
      return result;
    }, []);
  }
  return [];
}
