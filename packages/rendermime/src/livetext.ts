/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

/**
 * DOM machinery for incremental text-output rendering.
 *
 * The star of this module is `LiveText`, which transfers the auto-linking
 * progress of a render into a live `<pre>` in an append-only fashion (see the
 * class doc).
 *
 * The module depends only on the DOM; it imports nothing from `renderers.ts`,
 * so the dependency is one-way (`renderers.ts` imports from here).
 */

/**
 * Maximum number of characters per tail segment in the live render DOM.
 *
 * The not-yet-linkified remainder ("tail") of an output is kept as a series of
 * separate nodes so that consuming text from its front - which happens on
 * every frame - only touches nodes of bounded size, instead of rewriting one
 * huge text node whose layout cost would be proportional to everything that
 * remains.
 */
const TAIL_SEGMENT_MAX = 16384;

/**
 * A segment of the not-yet-linkified tail in the live render DOM.
 */
interface ITailSegment {
  /**
   * The live node: Text, or an ANSI-colored `<span>` piece, so the tail shows
   * source formatting before it has been linkified.
   */
  node: Text | HTMLSpanElement;
  /**
   * The number of characters the node is expected to hold. Compared against
   * the actual length before the segment is touched: a mismatch means another
   * component (e.g. search highlighting) mutated it, which triggers a rebuild
   * of the tail region of the live DOM (see `LiveText`; the committed region
   * is preserved, along with any highlights on it).
   */
  length: number;
}

/**
 * Live DOM state of an incrementally rendered output, kept per host across
 * frames and across renders (i.e. stream chunks).
 *
 * The `<pre>` holds two regions: `[0, committedLength)` is merged, linkified
 * content which is never touched again - so e.g. search highlights applied to
 * it survive subsequent frames - and the tail segments cover
 * `[committedLength, fullText.length)` with source-formatted plain text. Each
 * frame consumes segments from the front of the tail and replaces them with
 * merged (linkified) nodes appended to the committed region; per-frame DOM
 * work is thereby proportional to the text processed in that frame, not to
 * the total size of the output.
 */
interface ILiveRenderState {
  /**
   * The live `<pre>` element, child of the host.
   */
  pre: HTMLPreElement;
  /**
   * The full source text (as rendered, i.e. with ANSI codes stripped) that
   * the live DOM represents.
   */
  fullText: string;
  /**
   * Number of characters (from the start) covered by committed - merged and
   * linkified - content.
   */
  committedLength: number;
  /**
   * Tail segments; entries before `tailIndex` are already consumed.
   */
  tail: ITailSegment[];
  /**
   * Index of the first tail segment not yet consumed.
   */
  tailIndex: number;
}

/**
 * Split a shallow node (node without nested nodes inside) at a given text content position.
 *
 * @param node the shallow node to be split
 * @param at the position in textContent at which the split should occur
 */
function splitShallowNode<T extends Node>(
  node: T,
  at: number
): { pre: T; post: T } {
  const pre = node.cloneNode() as T;
  pre.textContent = (node.textContent ?? '').slice(0, at);
  const post = node.cloneNode() as T;
  post.textContent = (node.textContent ?? '').slice(at);
  return {
    pre,
    post
  };
}

/**
 * Iterate over some nodes, while tracking cumulative start and end position.
 */
function* nodeIter<T extends Node>(
  nodes: T[]
): IterableIterator<{ node: T; start: number; end: number; isText: boolean }> {
  let start = 0;
  let end;
  for (let node of nodes) {
    end = start + (node.textContent?.length || 0);
    yield {
      node,
      start,
      end,
      isText: node.nodeType === Node.TEXT_NODE
    };
    start = end;
  }
}

/**
 * Align two collections of nodes.
 *
 * If a text node in one collections spans an element in the other, yield the spanned elements.
 * Otherwise, split the nodes such that yielded pair start and stop on the same position.
 */
function* alignedNodes<T extends Node, U extends Node>(
  a: T[],
  b: U[]
): IterableIterator<[T, null] | [null, U] | [T, U]> {
  let iterA = nodeIter(a);
  let iterB = nodeIter(b);
  let nA = iterA.next();
  let nB = iterB.next();
  while (!nA.done && !nB.done) {
    let A = nA.value;
    let B = nB.value;

    if (A.isText && A.start <= B.start && A.end >= B.end) {
      // A is a text element that spans all of B, simply yield B
      yield [null, B.node];
      nB = iterB.next();
    } else if (B.isText && B.start <= A.start && B.end >= A.end) {
      // B is a text element that spans all of A, simply yield A
      yield [A.node, null];
      nA = iterA.next();
    } else {
      // There is some intersection, split one, unless they match exactly
      if (A.end === B.end && A.start === B.start) {
        yield [A.node, B.node];
        nA = iterA.next();
        nB = iterB.next();
      } else if (A.end > B.end) {
        /*
        A |-----[======]---|
        B |--[======]------|
                    | <- Split A here
                | <- trim B to start from here if needed
        */
        let { pre, post } = splitShallowNode(A.node, B.end - A.start);
        if (B.start < A.start) {
          // this node should not be yielded anywhere else, so ok to modify in-place
          B.node.textContent = (B.node.textContent ?? '').slice(
            A.start - B.start
          );
        }
        yield [pre, B.node];
        // Modify iteration result in-place:
        A.node = post;
        A.start = B.end;
        nB = iterB.next();
      } else if (B.end > A.end) {
        let { pre, post } = splitShallowNode(B.node, A.end - B.start);
        if (A.start < B.start) {
          // this node should not be yielded anywhere else, so ok to modify in-place
          A.node.textContent = (A.node.textContent ?? '').slice(
            B.start - A.start
          );
        }
        yield [A.node, pre];
        // Modify iteration result in-place:
        B.node = post;
        B.start = A.end;
        nA = iterA.next();
      } else {
        throw new Error(
          `Unexpected intersection: ${JSON.stringify(A)} ${JSON.stringify(B)}`
        );
      }
    }
  }
}

/**
 * Whether two nodes produced by the auto-linker represent the same anchor.
 *
 * Web anchors are identified by `href`; path anchors carry no `href` (the
 * path is resolved asynchronously after rendering) and are identified by
 * their pending path/locator data instead - without this, any two path
 * anchors would compare as equal through their empty `href`.
 */
function isSameAnchor(a: HTMLAnchorElement, b: HTMLAnchorElement): boolean {
  return (
    a.href === b.href &&
    a.dataset.path === b.dataset.path &&
    a.dataset.locator === b.dataset.locator
  );
}

/**
 * Merge `<span>` nodes from a `<pre>` element with `<a>` nodes from linker.
 */
export function mergeNodes(
  preNodes: (Text | HTMLSpanElement)[],
  linkedNodes: (Text | HTMLAnchorElement)[]
): HTMLPreElement {
  const ret = document.createElement('pre');
  let inAnchorElement = false;

  const combinedNodes: (HTMLAnchorElement | Text | HTMLSpanElement)[] = [];

  for (let nodes of alignedNodes(preNodes, linkedNodes)) {
    if (!nodes[0]) {
      const node = nodes[1];
      const isAnchor = node.nodeType !== Node.TEXT_NODE;
      const lastCombined = combinedNodes[combinedNodes.length - 1];
      if (
        isAnchor &&
        inAnchorElement &&
        isSameAnchor(
          node as HTMLAnchorElement,
          lastCombined as HTMLAnchorElement
        )
      ) {
        // Continuation of the anchor started by the previous pair: a boundary
        // between source-side nodes (an ANSI span edge, or a tail-segment
        // edge) fell inside the link, so `alignedNodes` yielded the anchor in
        // pieces. Fold this piece's content into the open anchor instead of
        // producing a second, adjacent anchor for the same URL.
        while (node.firstChild) {
          lastCombined.appendChild(node.firstChild);
        }
      } else {
        combinedNodes.push(node);
      }
      inAnchorElement = isAnchor;
      continue;
    } else if (!nodes[1]) {
      combinedNodes.push(nodes[0]);
      inAnchorElement = false;
      continue;
    }
    let [preNode, linkNode] = nodes;

    const lastCombined = combinedNodes[combinedNodes.length - 1];

    // If we are already in an anchor element and the anchor element did not change,
    // we should insert the node from <pre> which is either Text node or coloured span Element
    // into the anchor content as a child
    if (
      inAnchorElement &&
      isSameAnchor(
        linkNode as HTMLAnchorElement,
        lastCombined as HTMLAnchorElement
      )
    ) {
      lastCombined.appendChild(preNode);
    } else {
      // the `linkNode` is either Text or AnchorElement;
      const isAnchor = linkNode.nodeType !== Node.TEXT_NODE;
      // if we are NOT about to start an anchor element, just add the pre Node
      if (!isAnchor) {
        combinedNodes.push(preNode);
        inAnchorElement = false;
      } else {
        // otherwise start a new anchor; the contents of the `linkNode` and `preNode` should be the same,
        // so we just put the neatly formatted `preNode` inside the anchor node (`linkNode`)
        // and append that to combined nodes.
        linkNode.textContent = '';
        linkNode.appendChild(preNode);
        combinedNodes.push(linkNode);
        inAnchorElement = true;
      }
    }
  }
  // Do not reuse `pre` element. Clearing out previous children is too slow...
  for (const child of combinedNodes) {
    ret.appendChild(child);
  }
  return ret;
}

/**
 * Create a detached copy of the `[from, to)` character range of a shallow
 * node (Text, or an ANSI `<span>`, whose attributes are preserved).
 */
function sliceNodePiece(
  node: Text | HTMLSpanElement,
  from: number,
  to: number
): Text | HTMLSpanElement {
  const text = (node.textContent ?? '').slice(from, to);
  if (node instanceof Text) {
    return document.createTextNode(text);
  }
  const piece = node.cloneNode(false) as HTMLSpanElement;
  piece.textContent = text;
  return piece;
}

/**
 * Build detached tail segments covering the `[from, to)` character range of
 * the pristine source `<pre>`, splitting anything larger than
 * `TAIL_SEGMENT_MAX`.
 */
function buildTailSegments(
  sourcePre: HTMLPreElement,
  from: number,
  to: number
): ITailSegment[] {
  const segments: ITailSegment[] = [];
  let offset = 0;
  for (const child of sourcePre.childNodes) {
    if (offset >= to) {
      break;
    }
    // Only Text and `<span>` nodes are present after sanitization.
    const node = child as Text | HTMLSpanElement;
    const length = node.textContent?.length ?? 0;
    const start = Math.max(from, offset);
    const end = Math.min(to, offset + length);
    for (let at = start; at < end; at += TAIL_SEGMENT_MAX) {
      const pieceEnd = Math.min(end, at + TAIL_SEGMENT_MAX);
      segments.push({
        node: sliceNodePiece(node, at - offset, pieceEnd - offset),
        length: pieceEnd - at
      });
    }
    offset += length;
  }
  return segments;
}

/**
 * Selection offset in character relative to a root node.
 */
interface ISelectionOffsets {
  /**
   * Offset of the selection anchor end.
   */
  anchor: number | null;
  /**
   * Offset of the selection focus end.
   */
  focus: number | null;
}

/**
 * Internal structure used for selection offset computation
 */
interface ISelectionComputation extends ISelectionOffsets {
  /**
   * Number of characters already processed
   * by the recursive DOM traversal algorithm.
   */
  processedCharacters: number;
}

/**
 * Compute the position (anchor and focus) of the given selection
 * as characters offsets relative to the `root` node.
 *
 * For example, given the selection encompassing `am` in the sentence
 * `I am` we would expect to get anchor and focus with values 2 and 3
 * (depending on the selection direction). These character offsets are
 * stable, regardless of the number of DOM nodes encompassing the selection.
 *
 * This differs from the DOM-based selection representation used by browsers
 * where the offsets mean either characters, or position of nodes (depending
 * on parent node type), and are thus not suitable for retaining selection
 * when content of the root node is replaced.
 */
function computeSelectionCharacterOffset(
  root: Node,
  selection: Selection
): ISelectionComputation {
  let anchor: number | null = null;
  let focus: number | null = null;
  let offset = 0;
  for (const node of [...root.childNodes]) {
    if (node === selection.focusNode) {
      focus = offset + selection.focusOffset;
    }
    if (node === selection.anchorNode) {
      anchor = offset + selection.anchorOffset;
    }
    if (node.childNodes.length > 0) {
      const result = computeSelectionCharacterOffset(node, selection);
      // Compare against `null` rather than testing truthiness: an offset of
      // `0` is a valid position (the selection end is at the very start of a
      // nested node, e.g. the first character of a linkified URL) and must
      // not be discarded.
      if (result.anchor !== null) {
        anchor = offset + result.anchor;
      }
      if (result.focus !== null) {
        focus = offset + result.focus;
      }
      offset += result.processedCharacters;
    } else {
      offset += node.textContent!.length;
    }
    if (anchor !== null && focus !== null) {
      break;
    }
  }
  return {
    processedCharacters: offset,
    anchor,
    focus
  };
}

/**
 * Finds a text node and offset within the given root node
 * where the selection should be anchored to select exactly
 * from n-th character given by `textOffset`.
 */
function findTextSelectionNode(
  root: Node,
  textOffset: number | null,
  offset: number = 0
) {
  if (textOffset !== null) {
    for (const node of [...root.childNodes]) {
      // As much as possible avoid calling `textContent` here as it is slower
      const nodeEnd =
        node instanceof Text
          ? node.nodeValue!.length
          : ((node instanceof HTMLAnchorElement
              ? (node.childNodes[0].nodeValue?.length ??
                node.textContent?.length)
              : node.textContent?.length) ?? 0);
      // Use `>=` on the lower bound so an offset that falls exactly on a node
      // boundary is resolved to the start of that node. With a strict `>` the
      // offset `0` (start of content) and every inter-node boundary would be
      // missed, leaving the selection unrestored - the ranges are half-open
      // [offset, offset + nodeEnd), so each character position still maps to
      // exactly one node.
      if (textOffset >= offset && textOffset < offset + nodeEnd) {
        if (node instanceof Text) {
          return { node, positionOffset: textOffset - offset };
        } else {
          return findTextSelectionNode(node, textOffset, offset);
        }
      } else {
        offset += nodeEnd;
      }
    }
  }
  return {
    node: null,
    positionOffset: null
  };
}

/**
 * Modify given `selection` object to span between the
 * given selection offsets, within the given `root` node.
 */
function selectByOffsets(
  root: Node,
  selection: Selection,
  offsets: ISelectionOffsets
) {
  const { node: focusNode, positionOffset: focusOffset } =
    findTextSelectionNode(root, offsets.focus, 0);
  const { node: anchorNode, positionOffset: anchorOffset } =
    findTextSelectionNode(root, offsets.anchor, 0);
  if (
    anchorNode &&
    focusNode &&
    anchorOffset !== null &&
    focusOffset !== null
  ) {
    selection.setBaseAndExtent(
      anchorNode,
      anchorOffset,
      focusNode,
      focusOffset
    );
  }
}

/**
 * Run a DOM mutation, preserving the user selection (mapped through
 * character offsets relative to `root`) when it intersects any of the
 * `touched` nodes. Because the offsets are restored against the
 * post-mutation DOM, the mutation must keep them stable: the text content
 * of `root` up to and including the mutated region must be unchanged.
 * Appending new text strictly after it (as the stream-adoption path does)
 * is fine - such text lies beyond every restorable offset.
 */
function withSelectionPreserved(
  root: HTMLElement,
  touched: Node[],
  mutate: () => void
): void {
  const selection = window.getSelection();
  const affected =
    selection && touched.some(node => selection.containsNode(node, true));
  const offsets = affected
    ? computeSelectionCharacterOffset(root, selection!)
    : null;
  mutate();
  if (selection && offsets) {
    selectByOffsets(root, selection, offsets);
  }
}

/**
 * Live render state (see `ILiveRenderState`) per host. Kept across renders
 * (i.e. across `LiveText` instances, one per render) so that subsequent stream
 * chunks adopt the existing DOM instead of rebuilding it.
 */
const liveRenderStates = new WeakMap<HTMLElement, ILiveRenderState>();

/**
 * The live `<pre>` of a single incrementally rendered text output: the
 * auto-linking progress of a render is transferred into it one frame at a
 * time, append-only.
 *
 * A new instance is created for each render (each stream chunk); the live DOM
 * itself persists across renders in `liveRenderStates` and is adopted by the
 * next instance (see `seed`).
 *
 * The render feeds it the auto-linking progress on each call as
 * `(linkedNodes, processedLength)`:
 *
 * - `linkedNodes` is the working list of linkified nodes (Text / `<a>`) built
 *   so far. Per the *aliasing contract*, these nodes NEVER enter the DOM -
 *   `mergeNodes` receives clones of them (see `_takeWorkingSlice`) - so they
 *   stay pristine while components such as search highlighting mutate the
 *   rendered DOM.
 * - `processedLength` is the number of characters of the source that
 *   `linkedNodes` covers.
 *
 * Invariant maintained across `seed`/`commit`: the commit cursor
 * (`_workingIndex`, `_workingOffset`) addresses the position within
 * `linkedNodes` that corresponds to exactly `_state.committedLength`
 * committed characters; and the concatenated text of `linkedNodes` equals the
 * `processedLength`-character auto-linked prefix of the source. The cursor
 * offset may sit at the current end of a node - a committed Text node can
 * still grow afterwards (adjacent-Text join in the render's step loop), in
 * which case the next commit resumes inside it.
 */
export class LiveText {
  /**
   * @param host - The output host element the live `<pre>` lives in.
   * @param source - The pristine, parsed source `<pre>` (detached, with ANSI
   *   codes turned into `<span>`s); tail segments are cut from it.
   * @param fullText - The full rendered text (ANSI codes stripped) the render
   *   produces.
   */
  constructor(host: HTMLElement, source: HTMLPreElement, fullText: string) {
    this._host = host;
    this._source = source;
    this._fullText = fullText;
  }

  /**
   * Establish the live DOM this render commits into: adopt the DOM left by
   * the previous render of this host (the preceding stream chunk) when
   * possible, otherwise build it fresh.
   *
   * Must be called once, before the first `commit`, while `processedLength`
   * still equals the *seeded* progress: adoption trims the committed region
   * back to exactly that point, before the render's steps advance it.
   */
  seed(
    linkedNodes: (HTMLAnchorElement | Text)[],
    processedLength: number
  ): void {
    this._ensureState(linkedNodes, processedLength);
  }

  /**
   * Transfer this frame's progress into the live DOM. When the bookkeeping
   * no longer matches the DOM (another component mutated it - e.g. search
   * highlighting splitting, wrapping or normalizing text nodes), recover by
   * rebuilding only the tail, which preserves the committed region and any
   * highlights applied to it; fall back to a full rebuild when even the
   * committed region no longer checks out.
   */
  commit(
    linkedNodes: (HTMLAnchorElement | Text)[],
    processedLength: number
  ): void {
    this._ensureState(linkedNodes, processedLength);
    if (this._attemptCommit(linkedNodes, processedLength)) {
      return;
    }
    let tailRebuilt = false;
    try {
      tailRebuilt = this._rebuildTail();
    } catch (error) {
      console.error('Incremental tail rebuild failed.', error);
    }
    if (tailRebuilt && this._attemptCommit(linkedNodes, processedLength)) {
      return;
    }
    this._fresh();
    this._attemptCommit(linkedNodes, processedLength);
  }

  /**
   * Wrap up once this render has finished (or been superseded): drop the
   * consumed tail segment records, which pin detached boundary pieces and are
   * read by nothing anymore. On a completed render the tail was consumed
   * wholly, so this frees the whole array; on an interrupted one it is the
   * same compaction the next render's adoption would apply. The live state
   * itself is kept for the next render (stream chunk) to adopt.
   */
  finalize(): void {
    const state = this._state;
    if (state) {
      state.tail = state.tail.slice(state.tailIndex);
      state.tailIndex = 0;
    }
  }

  private _ensureState(
    linkedNodes: (HTMLAnchorElement | Text)[],
    processedLength: number
  ): void {
    if (!this._state && !this._tryAdopt(linkedNodes, processedLength)) {
      this._fresh();
    }
  }

  /**
   * Discard any adopted/previous DOM and rebuild the live `<pre>` from the
   * pristine source: full text as tail segments, nothing committed. The
   * fallback when no previous state exists or its bookkeeping no longer
   * matches the DOM (foreign mutation).
   */
  private _fresh(): void {
    const segments = buildTailSegments(this._source, 0, this._fullText.length);
    const live = document.createElement('pre');
    for (const segment of segments) {
      live.appendChild(segment.node);
    }
    withSelectionPreserved(this._host, [this._host], () => {
      this._host.replaceChildren(live);
    });
    this._state = {
      pre: live,
      fullText: this._fullText,
      committedLength: 0,
      tail: segments,
      tailIndex: 0
    };
    // Everything needs (re-)committing.
    this._workingIndex = 0;
    this._workingOffset = 0;
    liveRenderStates.set(this._host, this._state);
  }

  /**
   * Adopt the live DOM left by the previous render of this host (the
   * preceding stream chunk): trim the committed region back to the seeded
   * progress (the seed re-analyses the trailing cached node, e.g. a URL the
   * new chunk may extend), re-derive tail segments for the trimmed range, and
   * append segments for the newly added text.
   *
   * @returns Whether adoption succeeded; on `false` the caller builds fresh.
   */
  private _tryAdopt(
    linkedNodes: (HTMLAnchorElement | Text)[],
    processedLength: number
  ): boolean {
    const existing = liveRenderStates.get(this._host);
    if (!existing || existing.pre.parentNode !== this._host) {
      return false;
    }
    const fullText = this._fullText;
    // The previous content must be a prefix of the new content; this also
    // vouches for the (unvalidated-by-the-cache) tail region.
    if (!fullText.startsWith(existing.fullText)) {
      return false;
    }
    const seededLength = processedLength;
    if (seededLength > existing.committedLength) {
      return false;
    }
    if (seededLength === 0 && existing.committedLength > 0) {
      // Nothing usable was seeded (e.g. the chunk boundary fell inside the
      // only, link-free text node, dropping the whole cache - the shape of
      // partial-line progress streams): adoption would trim away the entire
      // committed region node by node only to re-derive it as pristine
      // segments. A fresh rebuild produces the identical result with a
      // single `replaceChildren`, so let the caller do that instead.
      return false;
    }

    // Plan the trim-back: walk backward from the end of the committed region
    // collecting whole nodes until exactly `committedLength - seededLength`
    // characters are covered. Merged nodes never cross working-node
    // boundaries, and the trim boundary is a working-node boundary, so the
    // walk must land exactly; landing mid-node means the DOM was mutated in
    // an unexpected way and we rebuild instead.
    const firstTail = existing.tail[existing.tailIndex]?.node ?? null;
    if (firstTail && firstTail.parentNode !== existing.pre) {
      return false;
    }
    let toRemove = existing.committedLength - seededLength;
    const removals: ChildNode[] = [];
    let cursor = firstTail ? firstTail.previousSibling : existing.pre.lastChild;
    while (toRemove > 0) {
      if (!cursor) {
        return false;
      }
      const length = cursor.textContent?.length ?? 0;
      if (length > toRemove) {
        return false;
      }
      removals.push(cursor);
      toRemove -= length;
      cursor = cursor.previousSibling;
    }

    // Re-derive source-formatted segments for the trimmed range and build
    // segments for the appended text, both from the pristine new parse.
    const trimmedSegments = buildTailSegments(
      this._source,
      seededLength,
      existing.committedLength
    );
    const appendedSegments = buildTailSegments(
      this._source,
      existing.fullText.length,
      fullText.length
    );
    withSelectionPreserved(existing.pre, removals, () => {
      for (const node of removals) {
        existing.pre.removeChild(node);
      }
      for (const segment of trimmedSegments) {
        existing.pre.insertBefore(segment.node, firstTail);
      }
      for (const segment of appendedSegments) {
        existing.pre.appendChild(segment.node);
      }
    });
    existing.tail = [
      ...trimmedSegments,
      ...existing.tail.slice(existing.tailIndex),
      ...appendedSegments
    ];
    existing.tailIndex = 0;
    existing.committedLength = seededLength;
    existing.fullText = fullText;
    this._state = existing;
    // The seeded working nodes cover exactly the committed region: position
    // the commit cursor at their end (inside the last node, so that it can
    // still grow via joins).
    if (linkedNodes.length > 0) {
      this._workingIndex = linkedNodes.length - 1;
      this._workingOffset = linkedNodes[this._workingIndex].textContent!.length;
    } else {
      this._workingIndex = 0;
      this._workingOffset = 0;
    }
    return true;
  }

  /**
   * Collect clones of the working nodes covering the next `chars` characters,
   * advancing the commit cursor. The DOM must only ever receive clones - see
   * the aliasing contract on `linkedNodes`.
   */
  private _takeWorkingSlice(
    linkedNodes: (HTMLAnchorElement | Text)[],
    chars: number
  ): (HTMLAnchorElement | Text)[] {
    const slice: (HTMLAnchorElement | Text)[] = [];
    while (chars > 0) {
      let node = linkedNodes[this._workingIndex];
      // Skip nodes consumed to their current end.
      while (this._workingOffset >= node.textContent!.length) {
        this._workingIndex += 1;
        this._workingOffset = 0;
        node = linkedNodes[this._workingIndex];
      }
      const available = node.textContent!.length - this._workingOffset;
      const used = Math.min(chars, available);
      if (this._workingOffset === 0 && used === node.textContent!.length) {
        slice.push(node.cloneNode(true) as HTMLAnchorElement | Text);
      } else {
        // Partial pieces are always Text: anchors are never split by commit
        // boundaries (commits end on working-node boundaries) and only Text
        // nodes grow via joins.
        slice.push(
          document.createTextNode(
            node.textContent!.slice(
              this._workingOffset,
              this._workingOffset + used
            )
          )
        );
      }
      this._workingOffset += used;
      chars -= used;
    }
    return slice;
  }

  /**
   * Run `_tryCommit`, translating a thrown error (the DOM diverged from the
   * bookkeeping in a way the commit validation did not anticipate) into a
   * `false` return so that the caller can recover.
   */
  private _attemptCommit(
    linkedNodes: (HTMLAnchorElement | Text)[],
    processedLength: number
  ): boolean {
    try {
      return this._tryCommit(linkedNodes, processedLength);
    } catch (error) {
      // Never leave the output wedged: the caller rebuilds.
      console.error('Incremental rendering commit failed; recovering.', error);
      return false;
    }
  }

  /**
   * Commit the auto-linking progress made since the last commit into the live
   * DOM: validate and consume the tail segments covering the newly linkified
   * range, merge them with the corresponding working nodes, and insert the
   * merged nodes in their place.
   *
   * @returns `false` when the tracked nodes no longer match the DOM (foreign
   * mutation, e.g. search highlighting splitting or normalizing them); the
   * caller then recovers.
   */
  private _tryCommit(
    linkedNodes: (HTMLAnchorElement | Text)[],
    processedLength: number
  ): boolean {
    const state = this._state;
    if (!state || state.pre.parentNode !== this._host) {
      return false;
    }
    const upTo = processedLength;
    const take = upTo - state.committedLength;
    if (take <= 0) {
      return true;
    }

    // Plan: validate and gather the tail segments covering the committed
    // range, without mutating anything yet.
    const whole: ITailSegment[] = [];
    let boundary: ITailSegment | null = null;
    let boundaryTake = 0;
    let index = state.tailIndex;
    let remaining = take;
    while (remaining > 0) {
      const segment = state.tail[index];
      if (
        !segment ||
        segment.node.parentNode !== state.pre ||
        (segment.node.textContent?.length ?? 0) !== segment.length
      ) {
        return false;
      }
      if (remaining >= segment.length) {
        whole.push(segment);
        remaining -= segment.length;
        index += 1;
      } else {
        boundary = segment;
        boundaryTake = remaining;
        remaining = 0;
      }
    }

    const linkedSlice = this._takeWorkingSlice(linkedNodes, take);
    const touched: Node[] = whole.map(segment => segment.node);
    if (boundary) {
      touched.push(boundary.node);
    }
    const insertBeforeNode = boundary
      ? boundary.node
      : (state.tail[index]?.node ?? null);

    withSelectionPreserved(state.pre, touched, () => {
      // Detach the consumed segments; they become the source-formatting side
      // of the merge (mutating them is fine - they are being replaced).
      const preNodes: (Text | HTMLSpanElement)[] = [];
      for (const segment of whole) {
        state.pre.removeChild(segment.node);
        preNodes.push(segment.node);
      }
      if (boundary) {
        preNodes.push(sliceNodePiece(boundary.node, 0, boundaryTake));
        // Shrink the live boundary segment in place.
        boundary.node.textContent = (boundary.node.textContent ?? '').slice(
          boundaryTake
        );
        boundary.length -= boundaryTake;
      }
      const merged = mergeNodes(preNodes, linkedSlice);
      for (const child of Array.from(merged.childNodes)) {
        state.pre.insertBefore(child, insertBeforeNode);
      }
    });

    state.tailIndex = index;
    state.committedLength = upTo;
    return true;
  }

  /**
   * Rebuild only the tail (not-yet-committed) region of the live DOM from
   * the pristine source, leaving the committed region - and any foreign
   * decorations applied to it, such as search highlights - untouched.
   *
   * This is the recovery for commit-time validation failures: those are
   * caused by another component mutating *tail* nodes (splitting, wrapping
   * or normalizing them), and the committed region - which the renderer
   * never touches after committing - needs no rebuilding. The walk verifies
   * that the committed region still holds exactly the first
   * `committedLength` characters of the source, so the recovery cannot
   * produce an inconsistent output.
   *
   * @returns Whether the tail was rebuilt; `false` when the committed region
   * no longer checks out (its text was altered, or a foreign element spans
   * the committed/tail boundary), in which case the caller falls back to a
   * full rebuild.
   */
  private _rebuildTail(): boolean {
    const state = this._state;
    if (!state || state.pre.parentNode !== this._host) {
      return false;
    }
    // Find the DOM position where the committed region ends, verifying its
    // content along the way. Foreign mutations may have split or merged
    // (`normalize()`) text nodes, so the boundary is located by character
    // count rather than through tracked nodes.
    const committed = state.committedLength;
    let offset = 0;
    let node: ChildNode | null = state.pre.firstChild;
    let firstTail: ChildNode | null = node;
    while (offset < committed) {
      if (!node) {
        return false;
      }
      const text = node.textContent ?? '';
      if (offset + text.length <= committed) {
        if (!state.fullText.startsWith(text, offset)) {
          return false;
        }
        offset += text.length;
        node = node.nextSibling;
        firstTail = node;
      } else {
        // The boundary falls inside this node. A Text node can be split
        // exactly at it (without affecting rendering or highlights); an
        // element spanning the boundary (e.g. a highlight of a match
        // crossing it) makes the boundary ambiguous.
        if (!(node instanceof Text)) {
          return false;
        }
        const take = committed - offset;
        if (
          state.fullText.slice(offset, committed) !== node.data.slice(0, take)
        ) {
          return false;
        }
        firstTail = node.splitText(take);
        offset = committed;
      }
    }
    // Replace everything past the boundary with pristine tail segments.
    const segments = buildTailSegments(
      this._source,
      committed,
      state.fullText.length
    );
    const removals: ChildNode[] = [];
    for (let n: ChildNode | null = firstTail; n !== null; n = n.nextSibling) {
      removals.push(n);
    }
    withSelectionPreserved(state.pre, removals, () => {
      for (const n of removals) {
        state.pre.removeChild(n);
      }
      for (const segment of segments) {
        state.pre.appendChild(segment.node);
      }
    });
    state.tail = segments;
    state.tailIndex = 0;
    return true;
  }

  private readonly _host: HTMLElement;
  private readonly _source: HTMLPreElement;
  private readonly _fullText: string;

  /**
   * The live DOM state this render commits into, established (adopted from
   * the previous render, or built fresh) on the first `seed`/`commit`.
   */
  private _state: ILiveRenderState | null = null;

  // Commit cursor into `linkedNodes` (see the class invariant).
  private _workingIndex = 0;
  private _workingOffset = 0;
}
