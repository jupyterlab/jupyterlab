// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactWidget } from './vdom';
import { StringExt } from '@lumino/algorithm';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from '@jupyter/react-components';
import { searchIcon } from '../icon';
import type { ISignal } from '@lumino/signaling';

/**
 * A suggestion shown under the filter box.
 */
export interface IFilterSuggestion {
  /**
   * The text shown in the list of suggestions.
   */
  label: string;

  /**
   * The query set in the filter box when the suggestion is picked.
   */
  value: string;
}

/**
 * The class name added to the filebrowser crumbs node.
 */
export interface IFilterBoxProps {
  /**
   * Whether to use case-sensitive search
   */
  caseSensitive?: boolean;

  /**
   * Whether the search box is disabled or not.
   */
  disabled?: boolean;

  /**
   * Whether to force a refresh.
   */
  forceRefresh?: boolean;

  /**
   * Get the suggestions to show under the filter box for a query.
   */
  getSuggestions?: (query: string) => IFilterSuggestion[];

  /**
   * An optional initial search value.
   */
  initialQuery?: string;

  /**
   * Pass a ref to the input element
   */
  inputRef?: React.RefObject<HTMLInputElement>;

  /**
   * Optional placeholder for the search box.
   */
  placeholder?: string;

  /**
   * Whether to show a search icon in the box.
   */
  showIcon?: boolean;

  /**
   * A function to callback when filter is updated.
   */
  updateFilter: (
    filterFn: (item: string) => Partial<IScore> | null,
    query?: string
  ) => void;

  /**
   * Whether to use the fuzzy filter.
   */
  useFuzzyFilter?: boolean;

  /**
   * Signal emitted when filter settings change
   */
  filterSettingsChanged?: ISignal<
    unknown,
    { [P in keyof IFilterBoxProps]?: IFilterBoxProps[P] }
  >;
}

/**
 * A text match score with associated content item.
 */
export interface IScore {
  /**
   * The numerical score for the text match.
   */
  score: number;

  /**
   * The indices of the text matches.
   */
  indices: number[] | null;
}

/**
 * Perform a fuzzy search on a single item.
 */
export function fuzzySearch(source: string, query: string): IScore | null {
  // Set up the match score and indices array.
  let score = Infinity;
  let indices: number[] | null = null;

  // Look for letters (including in Asian scripts), numbers, and diacritical marks.
  const rgx = /[\p{L}\p{N}\p{M}]+/gu;
  let continueSearch = true;

  // Search the source by word boundary.
  while (continueSearch) {
    // Find the next word boundary in the source.
    let rgxMatch = rgx.exec(source);

    // Break if there is no more source context.
    if (!rgxMatch) {
      break;
    }

    // Run the string match on the relevant substring.
    let match = StringExt.matchSumOfDeltas(source, query, rgxMatch.index);

    // Break if there is no match.
    if (!match) {
      break;
    }

    // Update the match if the score is better.
    if (match.score <= score) {
      score = match.score;
      indices = match.indices;
    }
  }

  // Bail if there was no match.
  if (!indices || score === Infinity) {
    return null;
  }

  // Handle a split match.
  return {
    score,
    indices
  };
}

export const updateFilterFunction = (
  value: string,
  useFuzzyFilter?: boolean,
  caseSensitive?: boolean
) => {
  return (item: string): Partial<IScore> | null => {
    if (useFuzzyFilter) {
      // Run the fuzzy search for the item and query.
      const query = value.toLowerCase();
      // Ignore the item if it is not a match.
      return fuzzySearch(item, query);
    }
    if (!caseSensitive) {
      item = item.toLocaleLowerCase();
      value = value.toLocaleLowerCase();
    }
    const i = item.indexOf(value);
    if (i === -1) {
      return null;
    }
    return {
      indices: [...Array(value.length).keys()].map(x => x + i)
    };
  };
};

export const FilterBox = (props: IFilterBoxProps): JSX.Element => {
  const [filter, setFilter] = useState(props.initialQuery ?? '');

  if (props.forceRefresh) {
    useEffect(() => {
      props.updateFilter((item: string) => {
        return {};
      });
    }, []);
  }
  const firstRender = useRef(true);
  const inputRef = props.inputRef ?? useRef<HTMLInputElement>();

  useEffect(() => {
    // If there is an initial search value, pass the parent the initial filter function for that value.
    if (firstRender.current) {
      firstRender.current = false;
      if (props.initialQuery !== undefined) {
        props.updateFilter(
          updateFilterFunction(
            props.initialQuery,
            props.useFuzzyFilter,
            props.caseSensitive
          ),
          props.initialQuery
        );
      }
    } else {
      if (inputRef.current) {
        // If filter settings changed, update the filter
        props.updateFilter(
          updateFilterFunction(
            inputRef.current.value,
            props.useFuzzyFilter,
            props.caseSensitive
          ),
          inputRef.current.value
        );
      }
    }
  }, [props.updateFilter, props.useFuzzyFilter, props.caseSensitive]);

  const [suggestions, setSuggestions] = useState<IFilterSuggestion[]>([]);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [listId] = useState(
    () => `jp-FilterBox-suggestions-${Private.nextId++}`
  );
  const [activeIndex, setActiveIndex] = useState(-1);
  const setSearchRef = useCallback(
    (node: HTMLInputElement | null) => {
      searchRef.current = node;
      if (props.inputRef) {
        (
          props.inputRef as React.MutableRefObject<HTMLInputElement | null>
        ).current = node;
      }
    },
    [props.inputRef]
  );

  /**
   * Handler for search input changes.
   */
  const handleChange = useCallback(
    (e: Event) => {
      const target = e.target as HTMLInputElement;
      setFilter(target.value);
      setSuggestions(props.getSuggestions?.(target.value) ?? []);
      props.updateFilter(
        updateFilterFunction(
          target.value,
          props.useFuzzyFilter,
          props.caseSensitive
        ),
        target.value
      );
    },
    [
      props.updateFilter,
      props.useFuzzyFilter,
      props.caseSensitive,
      props.getSuggestions
    ]
  );

  const options = (): HTMLElement[] =>
    Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []
    );

  /**
   * Set the query of a suggestion in the filter box.
   */
  const pickSuggestion = (suggestion: IFilterSuggestion) => {
    // The value attribute only sets the initial value of the search box.
    if (searchRef.current) {
      searchRef.current.value = suggestion.value;
    }
    setFilter(suggestion.value);
    setSuggestions([]);
    props.updateFilter(
      updateFilterFunction(
        suggestion.value,
        props.useFuzzyFilter,
        props.caseSensitive
      ),
      suggestion.value
    );
    searchRef.current?.focus();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      options()[0]?.focus();
    } else if (e.key === 'Escape' && suggestions.length > 0) {
      e.stopPropagation();
      setSuggestions([]);
    }
  };

  const handleOptionKeyDown = (
    e: React.KeyboardEvent,
    suggestion: IFilterSuggestion,
    index: number
  ) => {
    const items = options();
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        items[Math.min(index + 1, items.length - 1)]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (index === 0) {
          searchRef.current?.focus();
        } else {
          items[index - 1]?.focus();
        }
        break;
      case 'Enter':
        e.preventDefault();
        pickSuggestion(suggestion);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        setSuggestions([]);
        searchRef.current?.focus();
        break;
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setSuggestions([]);
    }
  };

  // Show the icon by default, or if the caller specifically requests it
  const showSearchIcon = props.showIcon ?? true;

  // Cast typing is required because HTMLInputElement and JupyterSearch element types don't exactly match
  const search = (
    <Search
      role="search"
      className="jp-FilterBox"
      ref={setSearchRef as React.Ref<any>}
      value={filter}
      onChange={handleChange}
      onInput={handleChange}
      onKeyDown={props.getSuggestions ? handleSearchKeyDown : undefined}
      placeholder={props.placeholder}
      disabled={props.disabled}
      aria-controls={props.getSuggestions ? listId : undefined}
      aria-expanded={props.getSuggestions ? suggestions.length > 0 : undefined}
    >
      {showSearchIcon && <searchIcon.react slot="end" tag={null} />}
    </Search>
  );

  if (!props.getSuggestions) {
    return search;
  }

  return (
    <div className="jp-FilterBox-wrapper" onBlur={handleBlur}>
      {search}
      {suggestions.length > 0 && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="jp-FilterBox-suggestions"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.value}
              role="option"
              aria-selected={index === activeIndex}
              tabIndex={-1}
              className="jp-FilterBox-suggestion"
              onMouseDown={e => e.preventDefault()}
              onClick={() => pickSuggestion(suggestion)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(-1)}
              onKeyDown={e => handleOptionKeyDown(e, suggestion, index)}
            >
              {suggestion.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * A widget which hosts a input textbox to filter on file names.
 */
class FilenameSearcherWidget extends ReactWidget {
  constructor(props: IFilterBoxProps) {
    super();
    this._filterBoxProps = { ...props };
    props?.filterSettingsChanged?.connect((_, args) => {
      this._updateProps(args);
    }, this);
  }

  render(): JSX.Element {
    return <FilterBox {...this._filterBoxProps} />;
  }

  /**
   * Update a specific prop.
   */
  private _updateProps(props: Partial<IFilterBoxProps>): void {
    Object.assign(this._filterBoxProps, props);
    this.update();
  }

  private _filterBoxProps: IFilterBoxProps;
}

/**
 * Function which returns a widget that hosts an input textbox to filter on file names.
 */
export const FilenameSearcher = (props: IFilterBoxProps): ReactWidget => {
  return new FilenameSearcherWidget(props);
};

namespace Private {
  /**
   * The id of the next list of suggestions.
   */
  export let nextId = 0;
}
