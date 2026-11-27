// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { jupyterHighlightStyle } from '@jupyterlab/codemirror';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import { InputGroup } from '@jupyterlab/ui-components';
import type { Tag } from '@lezer/highlight';
import { tags } from '@lezer/highlight';
import type { JSONArray, JSONObject, JSONValue } from '@lumino/coreutils';
import { JSONExt } from '@lumino/coreutils';
import * as React from 'react';
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
    StyleModule.mount(document, jupyterHighlightStyle.module!);
  }

  componentDidUpdate(): void {
    // New data can unmount the item that Tab reaches.
    const tree = this._tree.current;
    if (tree && !tree.querySelector('[role="treeitem"][tabindex="0"]')) {
      const root = tree.querySelector<HTMLElement>('[role="treeitem"]');
      if (root) {
        root.tabIndex = 0;
      }
    }
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
    const context: ITreeContext = {
      filter: this.state.filter,
      trans,
      isExpanded: (path, level) =>
        keyPaths.has(path) ||
        (this._expanded.get(path) ?? (level === 0 || !!metadata?.expanded)),
      onToggle: this._onToggle
    };
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
        <ul
          key={this.state.filter}
          ref={this._tree}
          className="jp-RenderedJSON-tree"
          role="tree"
          aria-label={trans.__('JSON tree')}
          onFocus={moveTabStop}
        >
          <TreeNode keyPath={[root]} value={data} level={0} context={context} />
        </ul>
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

  private _tree = React.createRef<HTMLUListElement>();
}

/**
 * The largest number of children that a node lists before it groups them in ranges.
 */
const COLLECTION_LIMIT = 100;

/**
 * What the nodes of a tree share.
 */
interface ITreeContext {
  /**
   * The search text, whose matches the nodes mark.
   */
  filter: string;

  /**
   * The bundle for the texts of the tree.
   */
  trans: TranslationBundle;

  /**
   * Whether the node at a key path starts expanded.
   */
  isExpanded: (path: string, level: number) => boolean;

  /**
   * Record that the user expanded or collapsed the node at a key path.
   */
  onToggle: (path: string, expanded: boolean) => void;
}

/**
 * The properties of a node of the tree.
 */
interface ITreeNodeProps {
  /**
   * The key of the node followed by the keys of its ancestors.
   */
  keyPath: (string | number)[];
  value: JSONValue;
  level: number;
  context: ITreeContext;
}

/**
 * A node of the tree, for a value of any type.
 */
function TreeNode(props: ITreeNodeProps): JSX.Element {
  const { value } = props;
  if (value !== null && typeof value === 'object') {
    return <CollectionNode {...props} value={value} />;
  }
  return <ValueNode {...props} />;
}

/**
 * A node for an object or an array.
 */
function CollectionNode(
  props: ITreeNodeProps & { value: JSONObject | JSONArray }
): JSX.Element {
  const { keyPath, value, level, context } = props;
  const path = JSON.stringify(keyPath);
  const expandable = getKeys(value).length > 0;
  const { expanded, item, toggle, onKeyDown } = useTreeItem(
    expandable && context.isExpanded(path, level),
    expandable,
    expanded => context.onToggle(path, expanded)
  );
  let className = 'jp-RenderedJSON-node';
  if (level === 0) {
    className += ' jp-mod-root';
  }
  if (!expandable) {
    className += ' jp-mod-empty';
  }
  return (
    <li
      ref={item}
      role="treeitem"
      aria-expanded={expandable ? expanded : undefined}
      tabIndex={level === 0 ? 0 : -1}
      className={className}
      onKeyDown={onKeyDown}
    >
      <div className="jp-RenderedJSON-row" onClick={toggle}>
        {expandable && <Arrow />}
        <Label text={`${keyPath[0]}`} filter={context.filter} />
        <ItemCount value={value} trans={context.trans} />
      </div>
      {expanded && (
        <ul role="group">
          {renderChildren(value, keyPath, level + 1, context, 0, Infinity)}
        </ul>
      )}
    </li>
  );
}

/**
 * The properties of a range of the children of a large collection.
 */
interface IRangeNodeProps {
  collection: JSONObject | JSONArray;
  keyPath: (string | number)[];
  level: number;
  context: ITreeContext;
  from: number;
  to: number;
}

/**
 * A node for a range of the children of a large collection.
 */
function RangeNode(props: IRangeNodeProps): JSX.Element {
  const { collection, keyPath, level, context, from, to } = props;
  const { expanded, item, toggle, onKeyDown } = useTreeItem(false, true);
  return (
    <li
      ref={item}
      role="treeitem"
      aria-expanded={expanded}
      tabIndex={-1}
      className="jp-RenderedJSON-range"
      onKeyDown={onKeyDown}
    >
      <div className="jp-RenderedJSON-row" onClick={toggle}>
        <Arrow double />
        {`${from} ... ${to}`}
      </div>
      {expanded && (
        <ul role="group">
          {renderChildren(collection, keyPath, level, context, from, to)}
        </ul>
      )}
    </li>
  );
}

/**
 * A node for a string, a number, a boolean or `null`.
 */
function ValueNode(props: ITreeNodeProps): JSX.Element {
  const { keyPath, value, level, context } = props;
  const { item, onKeyDown } = useTreeItem(false, false);
  let className = getStyle(tags.string);
  if (typeof value === 'number') {
    className = getStyle(tags.number);
  } else if (typeof value === 'boolean') {
    className = getStyle(tags.keyword);
  }
  const text = typeof value === 'string' ? `"${value}"` : `${value}`;
  return (
    <li
      ref={item}
      role="treeitem"
      tabIndex={level === 0 ? 0 : -1}
      className={`jp-RenderedJSON-value${level === 0 ? ' jp-mod-root' : ''}`}
      onKeyDown={onKeyDown}
    >
      <div className="jp-RenderedJSON-row">
        <Label text={`${keyPath[0]}`} filter={context.filter} />
        <span className={className}>
          <Highlight text={text} query={context.filter} />
        </span>
      </div>
    </li>
  );
}

/**
 * The key of a node, with the matches of the search marked.
 */
function Label(props: { text: string; filter: string }): JSX.Element {
  return (
    <span className="jp-RenderedJSON-label">
      <span className={getStyle(tags.keyword)}>
        <Highlight text={props.text} query={props.filter} />
      </span>
    </span>
  );
}

/**
 * The number of items of an array, or `{}` for an empty object.
 */
function ItemCount(props: {
  value: JSONObject | JSONArray;
  trans: TranslationBundle;
}): JSX.Element | null {
  const { value, trans } = props;
  const className = `jp-RenderedJSON-itemCount ${getStyle(tags.comment)}`;
  if (Array.isArray(value)) {
    return (
      <span className={className}>
        <span className="jp-RenderedJSON-itemType">[]</span>{' '}
        {trans._n('%1 item', '%1 items', value.length)}
      </span>
    );
  }
  if (getKeys(value).length === 0) {
    return (
      <span className={className}>
        <span className="jp-RenderedJSON-itemType">{'{}'}</span>
      </span>
    );
  }
  return null;
}

/**
 * The arrow that shows whether a node is expanded.
 */
function Arrow(props: { double?: boolean }): JSX.Element {
  return (
    <span
      className={`jp-RenderedJSON-arrow${props.double ? ' jp-mod-double' : ''}`}
      aria-hidden="true"
    >
      <span className="jp-RenderedJSON-arrowSign" />
    </span>
  );
}

/**
 * The state and the handlers of a tree item.
 */
function useTreeItem(
  initial: boolean,
  expandable: boolean,
  onToggle?: (expanded: boolean) => void
): {
  expanded: boolean;
  item: React.RefObject<HTMLLIElement>;
  toggle: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLLIElement>) => void;
} {
  const [expanded, setExpanded] = React.useState(initial);
  const item = React.useRef<HTMLLIElement>(null);
  const toggle = () => {
    if (!expandable) {
      return;
    }
    if (expanded) {
      keepTabStop(item.current);
    }
    setExpanded(!expanded);
    onToggle?.(!expanded);
  };
  // Keys of the ARIA tree view pattern, https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
  const onKeyDown = (event: React.KeyboardEvent<HTMLLIElement>) => {
    const current = event.currentTarget;
    // Keys with modifiers are shortcuts, such as Shift+Enter to run a cell.
    if (
      event.target !== current ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }
    switch (event.key) {
      case 'ArrowRight':
        if (expandable && !expanded) {
          toggle();
        } else {
          focusItem(current.querySelector('[role="treeitem"]'));
        }
        break;
      case 'ArrowLeft':
        if (expanded) {
          toggle();
        } else {
          focusItem(current.parentElement?.closest('[role="treeitem"]'));
        }
        break;
      case 'Enter':
      case ' ':
        toggle();
        break;
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Home':
      case 'End': {
        // Collapsed nodes do not render their children, so every item is visible.
        const items = Array.from(
          current
            .closest('[role="tree"]')
            ?.querySelectorAll('[role="treeitem"]') ?? []
        );
        const index = items.indexOf(current);
        const target = {
          ArrowDown: index + 1,
          ArrowUp: index - 1,
          Home: 0,
          End: items.length - 1
        }[event.key];
        if (!items[target]) {
          // Leave the key to the notebook, which moves to the adjacent cell.
          return;
        }
        focusItem(items[target]);
        break;
      }
      default:
        return;
    }
    event.preventDefault();
  };
  return { expanded, item, toggle, onKeyDown };
}

/**
 * Focus a tree item, if there is one.
 */
function focusItem(item: Element | null | undefined): void {
  if (item instanceof HTMLElement) {
    item.focus();
  }
}

/**
 * Make the focused tree item the one that Tab reaches.
 */
function moveTabStop(event: React.FocusEvent<HTMLElement>): void {
  const item = event.target;
  if (item.getAttribute('role') !== 'treeitem') {
    return;
  }
  for (const other of event.currentTarget.querySelectorAll<HTMLElement>(
    '[role="treeitem"][tabindex="0"]'
  )) {
    other.tabIndex = -1;
  }
  item.tabIndex = 0;
}

/**
 * Move the tab stop, and the focus, out of the children that a node hides.
 */
function keepTabStop(item: HTMLElement | null): void {
  const inner = item?.querySelector<HTMLElement>(
    '[role="treeitem"][tabindex="0"]'
  );
  if (!item || !inner) {
    return;
  }
  const focused = item.contains(document.activeElement);
  inner.tabIndex = -1;
  item.tabIndex = 0;
  if (focused) {
    item.focus();
  }
}

/**
 * The keys of an object, or the indices of an array.
 */
function getKeys(collection: JSONObject | JSONArray): (string | number)[] {
  return Array.isArray(collection)
    ? collection.map((_, index) => index)
    : Object.keys(collection);
}

/**
 * Render the children of a collection, from `from` to `to`, grouping them in
 * ranges when there are more than `COLLECTION_LIMIT`.
 */
function renderChildren(
  collection: JSONObject | JSONArray,
  keyPath: (string | number)[],
  level: number,
  context: ITreeContext,
  from: number,
  to: number
): JSX.Element[] {
  const keys = getKeys(collection);
  const valueOf = (key: string | number): JSONValue =>
    Array.isArray(collection)
      ? collection[key as number]
      : (collection as JSONObject)[key as string];
  const nodes = (start: number, end: number) =>
    keys
      .slice(start, end + 1)
      .map(key => (
        <TreeNode
          key={`node-${key}`}
          keyPath={[key, ...keyPath]}
          value={valueOf(key)}
          level={level}
          context={context}
        />
      ));
  const ranges = (start: number, end: number) =>
    getRanges(start, end).map(range => (
      <RangeNode
        key={`range-${range.from}-${range.to}`}
        collection={collection}
        keyPath={keyPath}
        level={level}
        context={context}
        from={range.from}
        to={range.to}
      />
    ));
  const length = Math.min(to - from, keys.length);
  if (length <= COLLECTION_LIMIT) {
    return nodes(from, to);
  }
  if (to < Infinity) {
    return ranges(from, to);
  }
  // The first and the last children stay visible around the ranges.
  return [
    ...nodes(0, COLLECTION_LIMIT - 5),
    ...ranges(COLLECTION_LIMIT - 4, length - 5),
    ...nodes(length - 4, length - 1)
  ];
}

/**
 * Split the indices from `from` to `to` in ranges, with at most
 * `COLLECTION_LIMIT` ranges in a level.
 */
function getRanges(from: number, to: number): { from: number; to: number }[] {
  let size = COLLECTION_LIMIT;
  while (to - from > size * size) {
    size = size * size;
  }
  const ranges = [];
  for (let start = from; start <= to; start += size) {
    ranges.push({ from: start, to: Math.min(to, start + size - 1) });
  }
  return ranges;
}

/**
 * The properties for a text with marked matches.
 */
interface IHighlightProps {
  text: string;
  query: string;
}

/**
 * A text with each match of the query marked, ignoring case.
 */
function Highlight(props: IHighlightProps): JSX.Element {
  const { text, query } = props;
  if (!query) {
    return <span>{text ? <span>{text}</span> : null}</span>;
  }
  // The group keeps the matches in the split, and adjacent matches share a mark.
  const pattern = new RegExp(`((?:${escapeRegExp(query)})+)`, 'i');
  return (
    <span>
      {text.split(pattern).map((part, index) => {
        if (!part) {
          return null;
        }
        return index % 2 === 1 ? (
          <mark key={index} className="jp-mod-selected">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </span>
  );
}

/**
 * Escape the characters that have a meaning in a regular expression.
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
}

function objectIncludes(data: JSONValue, query: string): boolean {
  return JSON.stringify(data).toLowerCase().includes(query);
}

/**
 * Get the key paths of the nodes that contain the query.
 *
 * The query must be in lower case: the search ignores case, like `Highlight`.
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
