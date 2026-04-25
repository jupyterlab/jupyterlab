/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import React from 'react';

/**
 * Widget for displaying optimization results.
 */
export function OptimizationResultsWidget({
  transformations,
  metrics
}: {
  transformations: Array<{ type: string; description: string }>;
  metrics: { complexityReduction: number };
}): JSX.Element {
  return (
    <div className="jp-code-optimizer-results">
      <h3>Optimization Results</h3>
      <div className="jp-code-optimizer-metrics">
        <span>Complexity Reduction: {metrics.complexityReduction.toFixed(1)}%</span>
      </div>
      {transformations.length > 0 && (
        <div className="jp-code-optimizer-transformations">
          <h4>Transformations Applied:</h4>
          <ul>
            {transformations.map((t, i) => (
              <li key={i}>
                {t.type}: {t.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
