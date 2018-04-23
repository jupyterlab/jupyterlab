import * as React from 'react';

import * as ReactDOM from 'react-dom';

import JSONTree from 'react-json-tree';

import * as Highlight from 'react-highlighter';

import {
  JSONValue,
  JSONObject,
  JSONArray
} from '@phosphor/coreutils';


/**
 * The properties for the JSON tree component.
 */
export
interface IProps {
  data: JSONValue;
  metadata?: JSONObject;
  theme?: string;
}


/**
 * The state of the JSON tree component.
 */
export
interface IState {
  filter?: string;
}


/**
 * A component that renders JSON data as a collapsible tree.
 */
export
class Component extends React.Component<IProps, IState> {
  state = { filter: '' };
  input: Element = null;
  timer: number = 0;

  componentDidMount() {
    /**
     * Stop propagation of keyboard events to JupyterLab
     */
    ReactDOM.findDOMNode(this.input).addEventListener(
      'keydown',
      (event: Event) => {
        event.stopPropagation();
      },
      false
    );
  }

  componentWillUnmount() {
    ReactDOM.findDOMNode(this.input).removeEventListener(
      'keydown',
      (event: Event) => {
        event.stopPropagation();
      },
      false
    );
  }

  render() {
    const { data, metadata } = this.props;
    const root = metadata && metadata.root ? metadata.root as string : 'root';
    const keyPaths = this.state.filter
      ? filterPaths(data, this.state.filter, [root])
      : [root];
    return (
      <div style={{
        position: 'relative',
        width: '100%'
      }}>
        <input
          ref={ref => this.input = ref}
          onChange={event => {
            if (this.timer) {
              window.clearTimeout(this.timer);
            }
            const filter = event.target.value;
            this.timer = window.setTimeout(
              () => {
                this.setState({ filter } as IState);
                this.timer = 0;
              },
              300
            );
          }}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '33%',
            maxWidth: 150,
            zIndex: 10,
            fontSize: 13,
            padding: '4px 2px'
          }}
          type='text'
          placeholder='Filter...'
        />
        <JSONTree
          data={data}
          collectionLimit={100}
          theme={{
            extend: theme,
            // TODO: Use Jupyter Notebook's current CodeMirror theme vs. 'cm-s-ipython'
            tree: `CodeMirror ${this.props.theme || 'cm-s-ipython'}`,
            // valueLabel: 'cm-variable',
            valueText: 'cm-string',
            // nestedNodeLabel: 'cm-variable-2',
            nestedNodeItemString: 'cm-comment',
            // value: {},
            // label: {},
            // itemRange: {},
            // nestedNode: {},
            // nestedNodeItemType: {},
            // nestedNodeChildren: {},
            // rootNodeChildren: {},
            arrowSign: { color: 'cm-variable' }
          }}
          invertTheme={false}
          keyPath={[root]}
          labelRenderer={([label, type]) => {
            let className = 'cm-variable';
            // if (type === 'root') className = 'cm-variable-2';
            if (type === 'array') {
              className = 'cm-variable-2';
            }
            if (type === 'object') {
              className = 'cm-variable-3';
            }
            return (
              <span className={className}>
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
              : keyPaths.join(',').includes(keyPath.join(','))}
        />
      </div>
    );
  }
}

const theme = {
  scheme: 'jupyter',
  base00: '#fff',
  base01: '#fff',
  base02: '#d7d4f0',
  base03: '#408080',
  base04: '#b4b7b4',
  base05: '#c5c8c6',
  base06: '#d7d4f0',
  base07: '#fff',
  base08: '#000',
  base09: '#080',
  base0A: '#fba922',
  base0B: '#408080',
  base0C: '#aa22ff',
  base0D: '#00f',
  base0E: '#008000',
  base0F: '#00f'
};

function objectIncludes(data: JSONValue, query: string): boolean {
  return JSON.stringify(data).includes(query);
}


function filterPaths(data: JSONValue, query: string, parent: JSONArray = ['root']): JSONArray {
  if (Array.isArray(data)) {
    return data.reduce(
      (result: JSONArray, item: JSONValue, index: number) => {
        if (item && typeof item === 'object' && objectIncludes(item, query)) {
          return [
            ...result,
            [index, ...parent].join(','),
            ...filterPaths(item, query, [index, ...parent])
          ];
        }
        return result;
      },
      []
    ) as JSONArray;
  }
  if (typeof data === 'object') {
    return Object.keys(data).reduce((result: JSONArray, key: string) => {
      let item = data[key];
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
}
