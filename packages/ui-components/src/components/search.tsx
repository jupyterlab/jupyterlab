// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { ReactWidget } from './vdom';
import { StringExt } from '@lumino/algorithm';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from '@jupyter/react-components';
import { searchIcon } from '../icon';
import { ISignal } from '@lumino/signaling';

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
    if (match && match.score <= score) {
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

  /**
   * Handler for search input changes.
   */
  const handleChange = useCallback(
    (e: Event) => {
      const target = e.target as HTMLInputElement;
      setFilter(target.value);
      props.updateFilter(
        updateFilterFunction(
          target.value,
          props.useFuzzyFilter,
          props.caseSensitive
        ),
        target.value
      );
    },
    [props.updateFilter, props.useFuzzyFilter, props.caseSensitive]
  );

  // Show the icon by default, or if the caller specifically requests it
  const showSearchIcon = props.showIcon ?? true;

  // Cast typing is required because HTMLInputElement and JupyterSearch element types don't exactly match
  return (
    <Search
      role="search"
      className="jp-FilterBox"
      ref={props.inputRef as React.Ref<any>}
      value={filter}
      onChange={handleChange}
      onInput={handleChange}
      placeholder={props.placeholder}
      disabled={props.disabled}
    >
      {showSearchIcon && <searchIcon.react slot="end" tag={null} />}
    </Search>
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
