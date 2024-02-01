// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  defaultHighlightStyle,
  HighlightStyle,
  syntaxHighlighting
} from '@codemirror/language';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { tags as t } from '@lezer/highlight';
import { IEditorTheme, IEditorThemeRegistry } from './token';

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

  '.cm-content': {
    caretColor: 'var(--jp-editor-cursor-color)'
  },

  /* Inherit font family from .cm-editor */
  '.cm-scroller': {
    fontFamily: 'inherit'
  },

  '.cm-cursor, .cm-dropCursor': {
    borderLeft:
      'var(--jp-code-cursor-width0) solid var(--jp-editor-cursor-color)'
  },

  '.cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--jp-editor-selected-background)'
  },

  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    backgroundColor: 'var(--jp-editor-selected-focused-background)'
  },

  '.cm-gutters': {
    borderRight: '1px solid var(--jp-border-color2)',
    backgroundColor: 'var(--jp-layout-color2)'
  },

  '.cm-gutter': {
    backgroundColor: 'var(--jp-layout-color2)'
  },

  '.cm-activeLine': {
    backgroundColor:
      'color-mix(in srgb, var(--jp-layout-color3) 25%, transparent)'
  },

  '.cm-lineNumbers': {
    color: 'var(--jp-ui-font-color2)'
  },

  '.cm-searchMatch': {
    backgroundColor: 'var(--jp-search-unselected-match-background-color)',
    color: 'var(--jp-search-unselected-match-color)'
  },

  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor:
      'var(--jp-search-selected-match-background-color) !important',
    color: 'var(--jp-search-selected-match-color) !important'
  },

  '.cm-tooltip': {
    backgroundColor: 'var(--jp-layout-color1)'
  }
});

// The list of available tags for syntax highlighting is available at
// https://lezer.codemirror.net/docs/ref/#highlight.tags
export const jupyterHighlightStyle = HighlightStyle.define([
  // Order matters - a rule will override the previous ones; important for example for in headings styles.
  { tag: t.meta, color: 'var(--jp-mirror-editor-meta-color)' },
  { tag: t.heading, color: 'var(--jp-mirror-editor-header-color)' },
  {
    tag: [t.heading1, t.heading2, t.heading3, t.heading4],
    color: 'var(--jp-mirror-editor-header-color)',
    fontWeight: 'bold'
  },
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
  {
    tag: t.standard(t.variableName),
    color: 'var(--jp-mirror-editor-builtin-color)'
  },
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
  {
    tag: [t.labelName, t.monospace, t.special(t.string)],
    color: 'var(--jp-mirror-editor-string-2-color)'
  },
  { tag: t.bracket, color: 'var(--jp-mirror-editor-bracket-color)' },
  { tag: t.tagName, color: 'var(--jp-mirror-editor-tag-color)' },
  { tag: t.attributeName, color: 'var(--jp-mirror-editor-attribute-color)' },
  { tag: t.quote, color: 'var(--jp-mirror-editor-quote-color)' },
  {
    tag: t.link,
    color: 'var(--jp-mirror-editor-link-color)',
    textDecoration: 'underline'
  },
  { tag: [t.separator, t.derefOperator, t.paren], color: '' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  {
    tag: t.bool,
    color: 'var(--jp-mirror-editor-keyword-color)',
    fontWeight: 'bold'
  }
]);

/**
 * JupyterLab CodeMirror 6 theme
 */
export const jupyterTheme: Extension = [
  jupyterEditorTheme,
  syntaxHighlighting(jupyterHighlightStyle)
];

/**
 * CodeMirror 6 theme registry
 */
export class EditorThemeRegistry implements IEditorThemeRegistry {
  /**
   * CodeMirror 6 themes
   */
  private _themeMap: Map<string, IEditorTheme> = new Map([
    ['jupyter', Object.freeze({ name: 'jupyter', theme: jupyterTheme })]
  ]);

  /**
   * Get all themes
   */
  get themes(): IEditorTheme[] {
    return Array.from(this._themeMap.values());
  }

  /**
   * Get the default CodeMirror 6 theme for JupyterLab
   *
   * @returns Default theme
   */
  defaultTheme(): Extension {
    return this._themeMap.get('jupyter')!.theme;
  }

  /**
   * Register a new theme.
   *
   * @param theme Codemirror 6 theme
   */
  addTheme(theme: IEditorTheme) {
    if (this._themeMap.has(theme.name)) {
      throw new Error(`A theme named '${theme.name}' is already registered.`);
    }
    this._themeMap.set(theme.name, { displayName: theme.name, ...theme });
  }

  /**
   * Get a theme.
   *
   * #### Notes
   * It falls back to the default theme
   *
   * @param name Theme name
   * @returns Theme extension
   */
  getTheme(name: string): Extension {
    const ext = this._themeMap.get(name)?.theme;

    return ext ?? this.defaultTheme();
  }
}

/**
 * EditorThemeRegistry namespace
 */
export namespace EditorThemeRegistry {
  /**
   * Get the default editor themes.
   *
   * @param translator Application translator
   * @returns Default CodeMirror 6 themes
   */
  export function getDefaultThemes(
    translator?: ITranslator | null
  ): ReadonlyArray<Readonly<IEditorTheme>> {
    const trans = (translator ?? nullTranslator).load('jupyterlab');
    return [
      Object.freeze({
        name: 'codemirror',
        displayName: trans.__('codemirror'),
        theme: [
          EditorView.baseTheme({}),
          syntaxHighlighting(defaultHighlightStyle)
        ]
      })
    ];
  }
}
