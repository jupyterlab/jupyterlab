/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

// Typescript 5.5 does not have the SetIterator type, but Rspack uses it.
// We define it here so we can import the Rspack packages.
// We can remove this file when we upgrade to Typescript 5.6 or later.

// type SetIterator<T> = Iterator<T>;
