/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

/**
 * @packageDocumentation
 * @module code-optimizer
 */

export { RuleBasedOptimizer } from './optimizer';
export { LSPOptimizer } from './lsp-optimizer';
export { LLMOptimizer } from './llm-optimizer';
export type {
  ICodeOptimizer,
  OptimizedCode,
  Transformation,
  OptimizationMetrics,
  OptimizationOptions
} from './interfaces';
export { analyzeCode, type CodeAnalysis } from './analysis';
export * from './transformers';
