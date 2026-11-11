// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PathExt } from '@jupyterlab/coreutils';

/**
 * Check if a path is within the navigation root.
 *
 * @param path - The path to check.
 * @param root - The navigation root; an empty root allows every path.
 * @returns Whether the path is within the root boundary.
 */
export function isPathWithinRoot(path: string, root: string): boolean {
  if (!root) {
    return true;
  }
  // Normalize paths for comparison (remove the leading slash)
  const normalizedPath = PathExt.removeSlash(path);
  const normalizedRoot = PathExt.removeSlash(root);
  // Path is valid if it equals the root or is a subdirectory of root
  return (
    normalizedPath === normalizedRoot ||
    normalizedPath.startsWith(normalizedRoot + '/')
  );
}
