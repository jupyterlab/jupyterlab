/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

/**
 * Interface for code optimizers.
 */
export interface ICodeOptimizer {
  /**
   * Optimize code based on the specified language and options.
   *
   * @param code - The source code to optimize
   * @param language - The programming language (e.g., 'python', 'javascript')
   * @param options - Optimization options
   * @returns Optimized code with transformation details
   */
  optimize(
    code: string,
    language: string,
    options?: OptimizationOptions
  ): OptimizedCode | Promise<OptimizedCode>;
}

/**
 * Result of code optimization.
 */
export interface OptimizedCode {
  /**
   * The optimized code.
   */
  code: string;

  /**
   * List of transformations applied.
   */
  transformations: Transformation[];

  /**
   * Optimization metrics.
   */
  metrics: OptimizationMetrics;

  /**
   * Optional explanation of changes (for LLM-based optimizations).
   */
  explanation?: string;
}

/**
 * Description of a single transformation.
 */
export interface Transformation {
  /**
   * Type of transformation (e.g., 'import-removal', 'constant-folding').
   */
  type: string;

  /**
   * Human-readable description of the transformation.
   */
  description: string;

  /**
   * Range in the original code that was transformed.
   */
  range: { start: number; end: number };

  /**
   * Confidence score (0-1) for the transformation quality.
   */
  confidence: number;
}

/**
 * Metrics for optimization results.
 */
export interface OptimizationMetrics {
  /**
   * Original code size in characters.
   */
  originalSize: number;

  /**
   * Optimized code size in characters.
   */
  optimizedSize: number;

  /**
   * Estimated complexity reduction as percentage (0-100).
   */
  complexityReduction: number;

  /**
   * Estimated execution time improvement (if measurable).
   */
  executionTimeImprovement?: number;
}

/**
 * Options for code optimization.
 */
export interface OptimizationOptions {
  /**
   * Enable rule-based optimizations.
   */
  enableRuleBased?: boolean;

  /**
   * Enable LSP-based optimizations.
   */
  enableLSP?: boolean;

  /**
   * Enable LLM-based optimizations.
   */
  enableLLM?: boolean;

  /**
   * Automatically apply optimizations without confirmation.
   */
  autoApply?: boolean;

  /**
   * Require user confirmation for major changes.
   */
  requireConfirmation?: boolean;

  /**
   * Specific optimization types to enable/disable.
   */
  optimizations?: {
    imports?: boolean;
    simplification?: boolean;
    complexity?: boolean;
    reusability?: boolean;
  };
}
