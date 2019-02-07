type Path<NODE, EDGE> = Iterable<[NODE, EDGE]>;
/**
 * Computes all the nodes reachable from some initial nodes.
 *
 * It returns a mapping of all reachable nodes, to the path to get
 * to that node, which has as it's first node of the initial nodes.
 *
 * @param edges Function mapping a node to it's adjacent nodes, and the edges between
 * that node and the other node.
 * @param initial Set of initial nodes to start traversing from.
 */
export function reachable<NODE, EDGE>(
  edges: (node: NODE) => Map<NODE, EDGE>,
  initial: Set<NODE>
): Map<NODE, Path<NODE, EDGE>> {
  // Nodes we still have to traverse
  const toTraverse = new Set(initial);
  // Mapping of nodes to the paths to get to that node.
  const paths: Map<NODE, Iterable<[NODE, EDGE]>> = new Map();
  for (const node of initial) {
    paths.set(node, []);
  }
  /**
   * To traverse a node, we go throw it's children and see if we already have paths to them
   * If we do not, we record a path to them and add them to the nodes to traverse.
   */
  function traverse(node: NODE) {
    const path = paths.get(node)!;
    for (const [child, edge] of edges(node).entries()) {
      if (paths.has(child)) {
        continue;
      }
      paths.set(child, [...path, [node, edge]]);
      toTraverse.add(child);
    }
    toTraverse.delete(node);
  }

  while (toTraverse.size !== 0) {
    traverse(toTraverse.values().next().value);
  }
  return paths;
}

/**
 * Expands the path returned by `reachable` so that each value contains the start node, the edge, and the end node,
 * instead of just the start node and the edge.
 * @param final Node the path ends on.
 * @param path Path of start nodes and edges. The first value will only have the final node filled in.
 */
export function* expandPath<NODE, EDGE>(
  final: NODE,
  path: Path<NODE, EDGE>
): Iterable<[NODE | null, EDGE | null, NODE]> {
  let lastStart: NODE | null = null;
  let lastEdge: EDGE | null = null;
  for (const [start, edge] of path) {
    yield [lastStart, lastEdge, start];
    lastStart = start;
    lastEdge = edge;
  }
  yield [lastStart, lastEdge, final];
}
