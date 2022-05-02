// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { InputGroup } from '@jupyterlab/ui-components';
import { StringExt } from '@lumino/algorithm';
import React, { useEffect, useState } from 'react';
import { ReactWidget } from './vdom';

/**
 * The class name added to the filebrowser crumbs node.
 */
export interface IFilterBoxProps {
  /**
   * A function to callback when filter is updated.
   */
  updateFilter: (filterFn: (item: string) => boolean, query?: string) => void;

  /**
   * Whether to use the fuzzy filter.
   */
  useFuzzyFilter: boolean;

  /**
   * Optional placeholder for the search box.
   */
  placeholder?: string;

  /**
   * Whether to force a refresh.
   */
  forceRefresh?: boolean;

  /**
   * Whether to use case-sensitive search
   */
  caseSensitive?: boolean;

  /**
   * An optional initial search value.
   */
  initialQuery?: string;
}

/**
 * A text match score with associated content item.
 */
interface IScore {
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
function fuzzySearch(source: string, query: string): IScore | null {
  // Set up the match score and indices array.
  let score = Infinity;
  let indices: number[] | null = null;

  // The regex for search word boundaries
  const rgx = /\b\w/g;

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
  useFuzzyFilter: boolean,
  caseSensitive?: boolean
) => {
  return (item: string) => {
    if (useFuzzyFilter) {
      // Run the fuzzy search for the item and query.
      const query = value.toLowerCase();
      let score = fuzzySearch(item, query);
      // Ignore the item if it is not a match.
      if (!score) {
        return false;
      }
      return true;
    }
    if (!caseSensitive) {
      item = item.toLocaleLowerCase();
      value = value.toLocaleLowerCase();
    }
    const i = item.indexOf(value);
    if (i === -1) {
      return false;
    }
    return true;
  };
};

export const FilterBox = (props: IFilterBoxProps) => {
  const [filter, setFilter] = useState(props.initialQuery ?? '');

  if (props.forceRefresh) {
    useEffect(() => {
      props.updateFilter((item: string) => {
        return true;
      });
    }, []);
  }

  useEffect(() => {
    // If there is an initial search value, pass the parent the initial filter function for that value.
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
  }, []);

  /**
   * Handler for search input changes.
   */
  const handleChange = (e: React.FormEvent<HTMLElement>) => {
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
  };

  return (
    <InputGroup
      type="text"
      rightIcon="ui-components:search"
      placeholder={props.placeholder}
      onChange={handleChange}
      className="jp-FilterBox"
      value={filter}
    />
  );
};

/**
 * A widget which hosts a input textbox to filter on file names.
 */
export const FilenameSearcher = (props: IFilterBoxProps) => {
  return ReactWidget.create(
    <FilterBox
      updateFilter={props.updateFilter}
      useFuzzyFilter={props.useFuzzyFilter}
      placeholder={props.placeholder}
      forceRefresh={props.forceRefresh}
      caseSensitive={props.caseSensitive}
    />
  );
};
