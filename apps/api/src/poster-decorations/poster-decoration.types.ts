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
  nameTextStyle: true,
  leftTextInsetTop: true,
  leftTextInsetRight: true,
  leftTextInsetBottom: true,
  leftTextInsetLeft: true,
  leftTextColor: true,
  leftTextStyle: true,
  rightTextInsetTop: true,
  rightTextInsetRight: true,
  rightTextInsetBottom: true,
  rightTextInsetLeft: true,
  rightTextColor: true,
  rightTextStyle: true,
  updatedAt: true,
} satisfies Prisma.PosterDecorationSelect;

export type PosterDecorationRecord = Prisma.PosterDecorationGetPayload<{
  select: typeof posterDecorationSelect;
}>;

export type PosterInsets = { top: number; right: number; bottom: number; left: number };

export type PosterTextStyle = {
  mode: 'solid' | 'gradient';
  gradient: { colors: string[]; angle: number };
  stroke: { enabled: boolean; color: string; width: number; opacity: number };
  shadow: {
    enabled: boolean;
    color: string;
    opacity: number;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
};

export type PosterNameArea = PosterInsets & {
  curve: number;
  color: string;
  /** Null = the built-in look; the web fills any missing field with its default. */
  style: PosterTextStyle | null;
};

export type PosterVerticalTextArea = PosterInsets & {
  color: string;
  style: PosterTextStyle | null;
};

/**
 * Only ever written from a validated PosterTextStyleDto, so any object read back is that shape (or
 * an older, smaller one, which the web completes with defaults).
 */
function readTextStyle(value: Prisma.JsonValue): PosterTextStyle | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as PosterTextStyle)
    : null;
}

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
    nameTextStyle,
    leftTextInsetTop,
    leftTextInsetRight,
    leftTextInsetBottom,
    leftTextInsetLeft,
    leftTextColor,
    leftTextStyle,
    rightTextInsetTop,
    rightTextInsetRight,
    rightTextInsetBottom,
    rightTextInsetLeft,
    rightTextColor,
    rightTextStyle,
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
            style: readTextStyle(nameTextStyle),
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
            style: readTextStyle(leftTextStyle),
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
            style: readTextStyle(rightTextStyle),
          },
    insets:
      insetTop === null || insetRight === null || insetBottom === null || insetLeft === null
        ? null
        : { top: insetTop, right: insetRight, bottom: insetBottom, left: insetLeft },
    imageUrl: imageFile ? `/poster-decorations/${record.id}/image?v=${updatedAt.getTime()}` : null,
  };
}
