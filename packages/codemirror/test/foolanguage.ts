/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * New mode example using https://github.com/codemirror/lang-example
 * Licensed under MIT License, Copyright (C) 2021 by Marijn Haverbeke <marijnh@gmail.com> and others
 */

import {
  delimitedIndent,
  foldInside,
  foldNodeProp,
  indentNodeProp,
  LanguageSupport,
  LRLanguage
} from '@codemirror/language';
import { styleTags, tags as t } from '@lezer/highlight';
import { parser } from './foo';

/**
 * Configure the parser
 */
let parserWithMetadata = parser.configure({
  props: [
    styleTags({
      Identifier: t.variableName,
      Boolean: t.bool,
      String: t.string,
      LineComment: t.lineComment,
      '( )': t.paren
    }),
    indentNodeProp.add({
      Application: delimitedIndent({ closing: ')', align: false })
    }),
    foldNodeProp.add({
      Application: foldInside
    })
  ]
});

/**
 * Define the new language
 */
const fooLanguage = LRLanguage.define({
  parser: parserWithMetadata,
  languageData: {
    commentTokens: { line: ';' }
  }
});

/**
 * Instantiate the language support for foo.
 *
 * @returns Foo language
 */
export function foo() {
  return new LanguageSupport(fooLanguage);
}
