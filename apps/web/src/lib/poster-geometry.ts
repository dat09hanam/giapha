import type { FamilyPoster } from '@/lib/poster-decorations';

/**
 * Where the tree sits on the phả đồ sheet. Shared by the tree layout and the
 * poster drawing.
 *
 * The background is the sheet's whole decoration. When the ADMIN marked a
 * tree area on it (its `insets`), the sheet is sized so the tree fills exactly
 * that area at any tree size. Otherwise the tree sits inside the frame band
 * with a small margin.
 */
export const POSTER_GEOMETRY = {
  /** Width of a built-in frame band, in canvas pixels at decoration scale 1. */
  band: 40,
  /** Margin between the frame band and the tree, at decoration scale 1. */
  margin: 60,
} as const;

const g = POSTER_GEOMETRY;

/** Distances in from each edge of the sheet. */
export type Edges = { top: number; right: number; bottom: number; left: number };

/** The background's tree area as fractions of the sheet in from each edge; null when none. */
export function backgroundTreeArea(poster: FamilyPoster): Edges | null {
  const insets = poster.background?.insets;
  if (!insets) return null;
  return {
    top: insets.top / 100,
    right: insets.right / 100,
    bottom: insets.bottom / 100,
    left: insets.left / 100,
  };
}

/** Where the tree is drawn, as pixel distances in from each edge of the sheet. */
export function posterTreeRegion(
  width: number,
  height: number,
  scale: number,
  treeArea: Edges | null,
): Edges {
  if (treeArea) {
    return {
      top: height * treeArea.top,
      right: width * treeArea.right,
      bottom: height * treeArea.bottom,
      left: width * treeArea.left,
    };
  }
  const edge = (g.band + g.margin) * scale;
  return { top: edge, right: edge, bottom: edge, left: edge };
}

/**
 * Smallest sheet at `ratio` whose tree region holds a tree of the given size.
 * Extra room from the ratio goes to the caller to spread rows.
 */
export function fitPosterSheet(
  treeArea: Edges | null,
  scale: number,
  tree: { width: number; height: number },
  ratio: number,
): { width: number; height: number } {
  let width: number;
  let height: number;
  if (treeArea) {
    width = tree.width / (1 - treeArea.left - treeArea.right);
    height = tree.height / (1 - treeArea.top - treeArea.bottom);
  } else {
    const edges = 2 * (g.band + g.margin) * scale;
    width = tree.width + edges;
    height = tree.height + edges;
  }
  if (width / height < ratio) width = height * ratio;
  else height = width / ratio;
  return { width, height };
}
