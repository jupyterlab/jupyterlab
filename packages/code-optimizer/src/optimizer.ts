/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ICodeOptimizer, OptimizedCode, OptimizationOptions } from './interfaces';
import { ImportTransformer } from './transformers/imports';
import { SimplificationTransformer } from './transformers/simplification';
import { ComplexityTransformer } from './transformers/complexity';
import { ReusabilityTransformer } from './transformers/reusability';

/**
 * Rule-based code optimizer using static analysis.
 *
 * This optimizer applies a series of deterministic transformations
 * based on code patterns and static analysis rules.
 */
export class RuleBasedOptimizer implements ICodeOptimizer {
  /**
   * Optimize code using rule-based transformations.
   */
  optimize(
    code: string,
    language: string,
    options?: OptimizationOptions
  ): OptimizedCode {
    const opts = this.normalizeOptions(options);
    let transformed = code;
    const transformations = [];

    // Phase 1: Import optimization
    if (opts.optimizations?.imports !== false) {
      const importTransformer = new ImportTransformer();
      const importResult = importTransformer.transform(transformed, language);
      transformed = importResult.code;
      transformations.push(...importResult.transformations);
    }

    // Phase 2: Code simplification
    if (opts.optimizations?.simplification !== false) {
      const simpTransformer = new SimplificationTransformer();
      const simpResult = simpTransformer.transform(transformed, language);
      transformed = simpResult.code;
      transformations.push(...simpResult.transformations);
    }

    // Phase 3: Complexity reduction
    if (opts.optimizations?.complexity !== false) {
      const compTransformer = new ComplexityTransformer();
      const compResult = compTransformer.transform(transformed, language);
      transformed = compResult.code;
      transformations.push(...compResult.transformations);
    }

    // Phase 4: Python pattern optimizations - DISABLED: regex-based pattern matching is too fragile and breaks code
    // if (language === 'python' && opts.optimizations?.simplification !== false) {
    //   const pythonPatternTransformer = new PythonPatternTransformer();
    //   const pythonPatternResult = pythonPatternTransformer.transform(
    //     transformed,
    //     language
    //   );
    //   transformed = pythonPatternResult.code;
    //   transformations.push(...pythonPatternResult.transformations);
    // }

    // Phase 5: Reusability improvements
    if (opts.optimizations?.reusability !== false) {
      const reusabilityTransformer = new ReusabilityTransformer();
      const reusabilityResult = reusabilityTransformer.transform(
        transformed,
        language
      );
      transformed = reusabilityResult.code;
      transformations.push(...reusabilityResult.transformations);
    }

    return {
      code: transformed,
      transformations,
      metrics: this.calculateMetrics(code, transformed)
    };
  }

  /**
   * Normalize options to ensure defaults are set.
   */
  private normalizeOptions(
    options?: OptimizationOptions
  ): Required<OptimizationOptions> {
    return {
      enableRuleBased: options?.enableRuleBased !== false,
      enableLSP: options?.enableLSP ?? false,
      enableLLM: options?.enableLLM ?? false,
      autoApply: options?.autoApply ?? false,
      requireConfirmation: options?.requireConfirmation ?? true,
      optimizations: {
        imports: options?.optimizations?.imports ?? true,
        simplification: options?.optimizations?.simplification ?? true,
        complexity: options?.optimizations?.complexity ?? true,
        reusability: options?.optimizations?.reusability ?? true
      }
    };
  }

  /**
   * Calculate optimization metrics.
   */
  private calculateMetrics(
    original: string,
    optimized: string
  ): OptimizedCode['metrics'] {
    const originalSize = original.length;
    const optimizedSize = optimized.length;
    const complexityReduction = this.estimateComplexityReduction(
      original,
      optimized
    );

    return {
      originalSize,
      optimizedSize,
      complexityReduction
    };
  }

  /**
   * Estimate complexity reduction based on code characteristics.
   */
  private estimateComplexityReduction(
    original: string,
    optimized: string
  ): number {
    // Simple heuristic: use size reduction as proxy for complexity
    // In a full implementation, this would use AST analysis
    const originalLines = original.split('\n').length;
    const optimizedLines = optimized.split('\n').length;
    const lineReduction = originalLines - optimizedLines;

    if (originalLines === 0) return 0;

    // Estimate: 10% reduction per line removed, capped at 50%
    const reduction = (lineReduction / originalLines) * 100;
    return Math.min(Math.max(reduction, 0), 50);
  }
}
