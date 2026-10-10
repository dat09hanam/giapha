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

export type PosterInsets = { top: number; right: number; bottom: number; left: number };

export type PosterNameArea = PosterInsets & {
  curve: number;
  color: string;
};

export type PosterVerticalTextArea = PosterInsets & { color: string };

export type PosterDecorationResponse = {
  id: string;
  kind: PosterDecorationKind;
  name: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  backgroundMode: PosterBackgroundMode | null;
  insets: PosterInsets | null;
  nameArea: PosterNameArea | null;
  leftTextArea: PosterVerticalTextArea | null;
  rightTextArea: PosterVerticalTextArea | null;
};

export type AdminPosterDecorationResponse = PosterDecorationResponse & {
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
