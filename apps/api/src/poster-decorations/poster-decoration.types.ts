import type { PosterBackgroundMode, PosterDecorationKind, Prisma } from '@prisma/client';

export const posterDecorationSelect = {
  id: true,
  kind: true,
  name: true,
  builtinKey: true,
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

export type PosterDecorationResponse = {
  id: string;
  kind: PosterDecorationKind;
  name: string;
  /** Set for decorations the web app draws itself. */
  builtinKey: string | null;
  /** API-relative image path for uploaded decorations, versioned so caches refresh on change. */
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  backgroundMode: PosterBackgroundMode | null;
  /** The area the tree is placed in; null keeps the tree inside the frame band. */
  insets: PosterInsets | null;
  /** Where the family name is written; null writes none. */
  nameArea: PosterNameArea | null;
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
    insets:
      insetTop === null || insetRight === null || insetBottom === null || insetLeft === null
        ? null
        : { top: insetTop, right: insetRight, bottom: insetBottom, left: insetLeft },
    imageUrl: imageFile ? `/poster-decorations/${record.id}/image?v=${updatedAt.getTime()}` : null,
  };
}
