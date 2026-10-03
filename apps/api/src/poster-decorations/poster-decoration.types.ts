import type { PosterBackgroundMode, PosterDecorationKind, Prisma } from '@prisma/client';

export const posterDecorationSelect = {
  id: true,
  kind: true,
  name: true,
  imageFile: true,
  isActive: true,
  sortOrder: true,
  backgroundMode: true,
  insetTop: true,
  insetRight: true,
  insetBottom: true,
  insetLeft: true,
  nameInsetTop: true,
  nameInsetRight: true,
  nameInsetBottom: true,
  nameInsetLeft: true,
  nameCurve: true,
  nameColor: true,
  leftTextInsetTop: true,
  leftTextInsetRight: true,
  leftTextInsetBottom: true,
  leftTextInsetLeft: true,
  leftTextColor: true,
  rightTextInsetTop: true,
  rightTextInsetRight: true,
  rightTextInsetBottom: true,
  rightTextInsetLeft: true,
  rightTextColor: true,
  updatedAt: true,
} satisfies Prisma.PosterDecorationSelect;

export type PosterDecorationRecord = Prisma.PosterDecorationGetPayload<{
  select: typeof posterDecorationSelect;
}>;

/** Percent of the art in from each edge; see `PosterDecoration.insetTop` in the schema. */
export type PosterInsets = { top: number; right: number; bottom: number; left: number };

/** Where the family name is written over the art, and how it bends. */
export type PosterNameArea = PosterInsets & {
  /** How far the name's middle rises above its ends, in percent of the area's height. */
  curve: number;
  color: string;
};

export type PosterVerticalTextArea = PosterInsets & { color: string };

export type PosterDecorationResponse = {
  id: string;
  kind: PosterDecorationKind;
  name: string;
  /** API-relative image path for uploaded decorations, versioned so caches refresh on change. */
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  backgroundMode: PosterBackgroundMode | null;
  /** The area the tree is placed in; null keeps the tree inside the frame band. */
  insets: PosterInsets | null;
  /** Where the family name is written; null writes none. */
  nameArea: PosterNameArea | null;
  /** Where family-specific text is written vertically on the left and right. */
  leftTextArea: PosterVerticalTextArea | null;
  rightTextArea: PosterVerticalTextArea | null;
};

export type AdminPosterDecorationResponse = PosterDecorationResponse & {
  /** How many families currently show this decoration. */
  usageCount: number;
};

export function toPosterDecorationResponse(
  record: PosterDecorationRecord,
): PosterDecorationResponse {
  const {
    imageFile,
    updatedAt,
    insetTop,
    insetRight,
    insetBottom,
    insetLeft,
    nameInsetTop,
    nameInsetRight,
    nameInsetBottom,
    nameInsetLeft,
    nameCurve,
    nameColor,
    leftTextInsetTop,
    leftTextInsetRight,
    leftTextInsetBottom,
    leftTextInsetLeft,
    leftTextColor,
    rightTextInsetTop,
    rightTextInsetRight,
    rightTextInsetBottom,
    rightTextInsetLeft,
    rightTextColor,
    ...rest
  } = record;
  return {
    ...rest,
    nameArea:
      nameInsetTop === null ||
      nameInsetRight === null ||
      nameInsetBottom === null ||
      nameInsetLeft === null
        ? null
        : {
            top: nameInsetTop,
            right: nameInsetRight,
            bottom: nameInsetBottom,
            left: nameInsetLeft,
            curve: nameCurve,
            color: nameColor,
          },
    leftTextArea:
      leftTextInsetTop === null ||
      leftTextInsetRight === null ||
      leftTextInsetBottom === null ||
      leftTextInsetLeft === null
        ? null
        : {
            top: leftTextInsetTop,
            right: leftTextInsetRight,
            bottom: leftTextInsetBottom,
            left: leftTextInsetLeft,
            color: leftTextColor,
          },
    rightTextArea:
      rightTextInsetTop === null ||
      rightTextInsetRight === null ||
      rightTextInsetBottom === null ||
      rightTextInsetLeft === null
        ? null
        : {
            top: rightTextInsetTop,
            right: rightTextInsetRight,
            bottom: rightTextInsetBottom,
            left: rightTextInsetLeft,
            color: rightTextColor,
          },
    insets:
      insetTop === null || insetRight === null || insetBottom === null || insetLeft === null
        ? null
        : { top: insetTop, right: insetRight, bottom: insetBottom, left: insetLeft },
    imageUrl: imageFile ? `/poster-decorations/${record.id}/image?v=${updatedAt.getTime()}` : null,
  };
}
