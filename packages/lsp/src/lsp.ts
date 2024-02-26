// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type * as lsp from 'vscode-languageserver-protocol';

export type ClientCapabilities = lsp.ClientCapabilities;

export type ServerCapabilities = lsp.ServerCapabilities;

export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4
}

export enum DiagnosticTag {
  Unnecessary = 1,
  Deprecated = 2
}

export enum CompletionItemTag {
  Deprecated = 1
}

export enum CompletionItemKind {
  Text = 1,
  Method = 2,
  Function = 3,
  Constructor = 4,
  Field = 5,
  Variable = 6,
  Class = 7,
  Interface = 8,
  Module = 9,
  Property = 10,
  Unit = 11,
  Value = 12,
  Enum = 13,
  Keyword = 14,
  Snippet = 15,
  Color = 16,
  File = 17,
  Reference = 18,
  Folder = 19,
  EnumMember = 20,
  Constant = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25
}

export enum DocumentHighlightKind {
  Text = 1,
  Read = 2,
  Write = 3
}

export enum CompletionTriggerKind {
  Invoked = 1,
  TriggerCharacter = 2,
  TriggerForIncompleteCompletions = 3
}

export enum AdditionalCompletionTriggerKinds {
  AutoInvoked = 9999
}

export type ExtendedCompletionTriggerKind =
  | CompletionTriggerKind
  | AdditionalCompletionTriggerKinds;

export type CompletionItemKindStrings = keyof typeof CompletionItemKind;

/**
 * The language identifier for LSP, with the preferred identifier as defined in the documentation
 * see the table in https://microsoft.github.io/language-server-protocol/specification#textDocumentItem
 */
export enum Languages {
  'abap' = 'ABAP',
  'bat' = 'Windows Bat',
  'bibtex' = 'BibTeX',
  'clojure' = 'Clojure',
  'coffeescript' = 'Coffeescript',
  'c' = 'C',
  'cpp' = 'C++',
  'csharp' = 'C#',
  'css' = 'CSS',
  'diff' = 'Diff',
  'dart' = 'Dart',
  'dockerfile' = 'Dockerfile',
  'elixir' = 'Elixir',
  'erlang' = 'Erlang',
  'fsharp' = 'F#',
  'git-commit' = 'Git (commit)',
  'git-rebase' = 'Git (rebase)',
  'go' = 'Go',
  'groovy' = 'Groovy',
  'handlebars' = 'Handlebars',
  'html' = 'HTML',
  'ini' = 'Ini',
  'java' = 'Java',
  'javascript' = 'JavaScript',
  'javascriptreact' = 'JavaScript React',
  'json' = 'JSON',
  'latex' = 'LaTeX',
  'less' = 'Less',
  'lua' = 'Lua',
  'makefile' = 'Makefile',
  'markdown' = 'Markdown',
  'objective-c' = 'Objective-C',
  'objective-cpp' = 'Objective-C++',
  'perl' = 'Perl',
  'perl6' = 'Perl 6',
  'php' = 'PHP',
  'powershell' = 'Powershell',
  'jade' = 'Pug',
  'python' = 'Python',
  'r' = 'R',
  'razor' = 'Razor (cshtml)',
  'ruby' = 'Ruby',
  'rust' = 'Rust',
  'scss' = 'SCSS (syntax using curly brackets)',
  'sass' = 'SCSS (indented syntax)',
  'scala' = 'Scala',
  'shaderlab' = 'ShaderLab',
  'shellscript' = 'Shell Script (Bash)',
  'sql' = 'SQL',
  'swift' = 'Swift',
  'typescript' = 'TypeScript',
  'typescriptreact' = 'TypeScript React',
  'tex' = 'TeX',
  'vb' = 'Visual Basic',
  'xml' = 'XML',
  'xsl' = 'XSL',
  'yaml' = 'YAML'
}

export type RecommendedLanguageIdentifier = keyof typeof Languages;

/**
 * Language identifier for the LSP server, allowing any string but preferring
 * the identifiers as recommended by the LSP documentation.
 */
export type LanguageIdentifier = RecommendedLanguageIdentifier | string;

/**
 * Type represents a location inside a resource, such as a line
 * inside a text file.
 */
export type AnyLocation =
  | lsp.Location
  | lsp.Location[]
  | lsp.LocationLink[]
  | undefined
  | null;

/**
 * Type represents the completion result.
 */
export type AnyCompletion = lsp.CompletionList | lsp.CompletionItem[];
