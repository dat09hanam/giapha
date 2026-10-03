"use client";

import { BaseEdge, type EdgeProps, type EdgeTypes } from "@xyflow/react";

import { BRACKET_INSET } from "@/lib/family-layout";
import type { FamilyLinkEdgeType } from "@/lib/tree-layout";

/**
 * How far every line reaches past its handle into the card. Lines are drawn
 * beneath the cards, so the overlap is hidden and the visible line always
 * meets the frame, whatever the zoom; handles sit a hair outside the card and
 * the frame art has a thin transparent rim.
 */
const CARD_OVERLAP = 8;

/**
 * Marriage lines between side-by-side spouses, marriage brackets below the
 * row, and child lines that start at the middle of the parents' marriage line,
 * drop to a bus and then down to the child.
 */
function FamilyLinkEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceHandleId,
  data,
  style,
}: EdgeProps<FamilyLinkEdgeType>) {
  if (!data) return null;

  if (data.kind === "spouse") {
    const path =
      "M " + (sourceX - CARD_OVERLAP) + " " + sourceY +
      " L " + (targetX + CARD_OVERLAP) + " " + targetY;
    return <BaseEdge path={path} style={style} />;
  }

  if (data.kind === "bracket") {
    const y = Math.max(sourceY, targetY) + data.drop;
    const path =
      "M " + (sourceX + BRACKET_INSET) + " " + (sourceY - CARD_OVERLAP) +
      " V " + y +
      " H " + (targetX - BRACKET_INSET) +
      " V " + (targetY - CARD_OVERLAP);
    return <BaseEdge path={path} style={style} />;
  }

  const startX = sourceX + data.offsetX;
  const startY = sourceY + data.offsetY;
  const busY = Math.max(startY, targetY - data.busOffset);
  // A lone parent's line leaves the bottom of their card, so it starts inside it.
  const fromCard = sourceHandleId === "child-source" && data.offsetY === 0;
  const path =
    "M " + startX + " " + (fromCard ? startY - CARD_OVERLAP : startY) +
    " V " + busY +
    " H " + targetX +
    " V " + (targetY + CARD_OVERLAP);
  return <BaseEdge path={path} style={style} />;
}

export const familyEdgeTypes = { familyLink: FamilyLinkEdge } satisfies EdgeTypes;
