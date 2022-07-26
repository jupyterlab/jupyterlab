// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

export const jupyterEditorTheme = EditorView.theme({
  /**
   * CodeMirror themes are handling the background/color in this way. This works
   * fine for CodeMirror editors outside the notebook, but the notebook styles
   * these things differently.
   */
  '&': {
    background: 'var(--jp-layout-color0)',
    color: 'var(--jp-content-font-color1)'
  },

  /* In the notebook, we want this styling to be handled by its container */
  '.jp-CodeConsole &, .jp-Notebook &': {
    background: 'transparent'
  },

  'cm-cursor': {
    borderLeft:
      'var(--jp-code-cursor-width0) solid var(--jp-editor-cursor-color)'
  },

  'cm-gutter, cm-activeLine': {
    backgroundColor: 'var(--jp-layout-color2)'
  }
});

// The list of available tags for syntax highlighting is available at
// https://lezer.codemirror.net/docs/ref/#highlight.tags
export const jupyterHighlightStyle = HighlightStyle.define([
  {
    tag: t.keyword,
    color: 'var(--jp-mirror-editor-keyword-color)',
    fontWeight: 'bold'
  },
  { tag: t.atom, color: 'var(--jp-mirror-editor-atom-color)' },
  { tag: t.number, color: 'var(--jp-mirror-editor-number-color)' },
  {
    tag: [t.definition(t.name), t.function(t.definition(t.variableName))],
    color: 'var(--jp-mirror-editor-def-color)'
  },
  { tag: t.variableName, color: 'var(--jp-mirror-editor-variable-color)' },
  {
    tag: [t.special(t.variableName), t.self],
    color: 'var(--jp-mirror-editor-variable-2-color)'
  },
  { tag: t.punctuation, color: 'var(--jp-mirror-editor-punctuation-color)' },
  { tag: t.propertyName, color: 'var(--jp-mirror-editor-property-color)' },
  {
    tag: t.operator,
    color: 'var(--jp-mirror-editor-operator-color)',
    fontWeight: 'bold'
  },
  {
    tag: t.comment,
    color: 'var(--jp-mirror-editor-comment-color)',
    fontStyle: 'italic'
  },
  { tag: t.string, color: 'var(--jp-mirror-editor-string-color)' },
  { tag: t.special(t.string), color: 'var(--jp-mirror-editor-string-2-color)' },
  { tag: t.meta, color: 'var(--jp-mirror-editor-meta-color)' },
  { tag: t.bracket, color: 'var(--jp-mirror-editor-bracket-color)' },
  { tag: t.tagName, color: 'var(--jp-mirror-editor-tag-color)' },
  { tag: t.attributeName, color: 'var(--jp-mirror-editor-attribute-color)' },
  { tag: t.heading, color: 'var(--jp-mirror-editor-header-color)' },
  { tag: t.quote, color: 'var(--jp-mirror-editor-quote-color)' },
  { tag: t.link, color: 'var(--jp-mirror-editor-link-color)' },
  { tag: [t.separator, t.derefOperator, t.paren], color: '' }
]);

export const jupyterTheme: Extension = [
  jupyterEditorTheme,
  syntaxHighlighting(jupyterHighlightStyle)
];

export namespace Theme {
  const themeMap: Map<string, Extension> = new Map([['jupyter', jupyterTheme]]);

  export function defaultTheme(): Extension {
    return themeMap.get('jupyter')!;
  }

  export function registerTheme(name: string, theme: Extension) {
    themeMap.set(name, theme);
  }

  export function getTheme(value: string): Extension {
    let ext = themeMap.get(value);
    if (!ext) {
      ext = this.defaultTheme();
    }
    return ext!;
  }
}
