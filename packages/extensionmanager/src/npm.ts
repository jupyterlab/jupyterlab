// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Check whether the NPM org is a Jupyter one.
 */
export function isJupyterOrg(name: string): boolean {
  /**
   * A list of jupyterlab NPM orgs.
   */
  const jupyterOrg = ['jupyterlab', 'jupyter-widgets'];
  const parts = name.split('/');
  const first = parts[0];
  return (
    parts.length > 1 && // Has a first part
    !!first && // with a finite length
    first[0] === '@' && // corresponding to an org name
    jupyterOrg.indexOf(first.slice(1)) !== -1 // in the org allowedExtensions.
  );
}
