"use client";

import { BaseEdge, type EdgeProps, type EdgeTypes } from "@xyflow/react";

import { BRACKET_INSET } from "@/lib/family-layout";
import type { FamilyLinkData, FamilyLinkEdgeType } from "@/lib/tree-layout";

/**
 * How far every line reaches past its handle into the card. Lines are drawn
 * beneath the cards, so the overlap is hidden and the visible line always
 * meets the frame, whatever the zoom; handles sit a hair outside the card and
 * the frame art has a thin transparent rim.
 */
const CARD_OVERLAP = 8;

export type FamilyLinkEnds = {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourceHandleId?: string | null;
  data: FamilyLinkData;
};

/**
 * Marriage lines between side-by-side spouses, marriage brackets below the
 * row, and child lines that start at the middle of the parents' marriage line,
 * drop to a bus and then down to the child. Shared by the canvas and the
 * printed poster.
 */
export function familyLinkPath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceHandleId,
  data,
}: FamilyLinkEnds): string {
  if (data.kind === "spouse") {
    return (
      "M " + (sourceX - CARD_OVERLAP) + " " + sourceY +
      " L " + (targetX + CARD_OVERLAP) + " " + targetY
    );
  }

  if (data.kind === "bracket") {
    const y = Math.max(sourceY, targetY) + data.drop;
    return (
      "M " + (sourceX + BRACKET_INSET) + " " + (sourceY - CARD_OVERLAP) +
      " V " + y +
      " H " + (targetX - BRACKET_INSET) +
      " V " + (targetY - CARD_OVERLAP)
    );
  }

  const startX = sourceX + data.offsetX;
  const startY = sourceY + data.offsetY;
  const busY = Math.max(startY, targetY - data.busOffset);
  // A lone parent's line leaves the bottom of their card, so it starts inside it.
  const fromCard = sourceHandleId === "child-source" && data.offsetY === 0;
  return (
    "M " + startX + " " + (fromCard ? startY - CARD_OVERLAP : startY) +
    " V " + busY +
    " H " + targetX +
    " V " + (targetY + CARD_OVERLAP)
  );
}

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
  const path = familyLinkPath({ sourceX, sourceY, targetX, targetY, sourceHandleId, data });
  return <BaseEdge path={path} style={style} />;
}

export const familyEdgeTypes = { familyLink: FamilyLinkEdge } satisfies EdgeTypes;
