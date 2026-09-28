"use client";

import { BaseEdge, type EdgeProps, type EdgeTypes } from "@xyflow/react";

import { BRACKET_INSET } from "@/lib/family-layout";
import type { FamilyLinkEdgeType } from "@/lib/tree-layout";

/**
 * Marriage brackets below the row, and child lines that start at the middle of
 * the parents' marriage line, drop to a bus and then down to the child.
 */
function FamilyLinkEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
}: EdgeProps<FamilyLinkEdgeType>) {
  if (!data) return null;

  if (data.kind === "bracket") {
    const y = Math.max(sourceY, targetY) + data.drop;
    const path =
      "M " + (sourceX + BRACKET_INSET) + " " + sourceY +
      " V " + y +
      " H " + (targetX - BRACKET_INSET) +
      " V " + targetY;
    return <BaseEdge path={path} style={style} />;
  }

  const startX = sourceX + data.offsetX;
  const startY = sourceY + data.offsetY;
  const busY = Math.max(startY, targetY - data.busOffset);
  const path =
    "M " + startX + " " + startY +
    " V " + busY +
    " H " + targetX +
    " V " + targetY;
  return <BaseEdge path={path} style={style} />;
}

export const familyEdgeTypes = { familyLink: FamilyLinkEdge } satisfies EdgeTypes;
