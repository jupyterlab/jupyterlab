/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

/**
 * Code analysis utilities for understanding code structure and characteristics.
 */

/**
 * Analyze code structure and return metrics.
 */
export function analyzeCode(code: string, language: string): CodeAnalysis {
  const lines = code.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);

  return {
    lineCount: lines.length,
    nonEmptyLineCount: nonEmptyLines.length,
    characterCount: code.length,
    language,
    hasImports: detectImports(code, language),
    hasFunctions: detectFunctions(code, language),
    hasLoops: detectLoops(code, language),
    hasClasses: detectClasses(code, language)
  };
}

/**
 * Result of code analysis.
 */
export interface CodeAnalysis {
  lineCount: number;
  nonEmptyLineCount: number;
  characterCount: number;
  language: string;
  hasImports: boolean;
  hasFunctions: boolean;
  hasLoops: boolean;
  hasClasses: boolean;
}

/**
 * Detect if code contains import statements.
 */
function detectImports(code: string, language: string): boolean {
  const patterns: Record<string, RegExp[]> = {
    python: [/^import\s+/m, /^from\s+.+\s+import\s+/m],
    javascript: [/^import\s+/m, /^const\s+.*=\s+require\(/m],
    typescript: [/^import\s+/m, /^const\s+.*=\s+require\(/m]
  };

  const langPatterns = patterns[language] || patterns.python;
  return langPatterns.some(pattern => pattern.test(code));
}

/**
 * Detect if code contains function definitions.
 */
function detectFunctions(code: string, language: string): boolean {
  const patterns: Record<string, RegExp[]> = {
    python: [/^def\s+/m],
    javascript: [/^function\s+/m, /^\w+\s*=\s*\(/m, /^const\s+\w+\s*=\s*\(/m],
    typescript: [/^function\s+/m, /^\w+\s*=\s*\(/m, /^const\s+\w+\s*=\s*\(/m]
  };

  const langPatterns = patterns[language] || patterns.python;
  return langPatterns.some(pattern => pattern.test(code));
}

/**
 * Detect if code contains loop constructs.
 */
function detectLoops(code: string, language: string): boolean {
  const patterns: Record<string, RegExp[]> = {
    python: [/^\s+for\s+/m, /^\s+while\s+/m],
    javascript: [/^\s+for\s+/m, /^\s+while\s+/m, /\.forEach\(/m],
    typescript: [/^\s+for\s+/m, /^\s+while\s+/m, /\.forEach\(/m]
  };

  const langPatterns = patterns[language] || patterns.python;
  return langPatterns.some(pattern => pattern.test(code));
}

/**
 * Detect if code contains class definitions.
 */
function detectClasses(code: string, language: string): boolean {
  const patterns: Record<string, RegExp[]> = {
    python: [/^class\s+/m],
    javascript: [/^class\s+/m],
    typescript: [/^class\s+/m]
  };

  const langPatterns = patterns[language] || patterns.python;
  return langPatterns.some(pattern => pattern.test(code));
}
