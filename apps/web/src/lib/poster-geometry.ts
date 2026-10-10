import type { FamilyPoster } from '@/lib/poster-decorations';

export const POSTER_GEOMETRY = {
  band: 40,
  margin: 60,
} as const;

const g = POSTER_GEOMETRY;

export type Edges = { top: number; right: number; bottom: number; left: number };

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
