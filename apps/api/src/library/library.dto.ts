import {
  IsBase64,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

/** Album photos are shrunk on the phone; this keeps one per request well under the 6 MB body limit. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
/** PDFs are sent as they are, so they get the room left in one request. */
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
export const MAX_THUMB_BYTES = 200 * 1024;

const base64Length = (bytes: number): number => Math.ceil((bytes * 4) / 3) + 16;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class SaveAlbumDto {
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;
}

/** Shared by photos and documents: what the item shows and who it is about. */
class ItemDetailsDto {
  @IsOptional()
  @IsString()
  @MaxLength(191)
  title?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  /** `YYYY-MM-DD`, or null when unknown. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(DAY)
  takenOn?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  personId?: string | null;
}

export class UpdateLibraryItemDto extends ItemDetailsDto {}

class UploadDto extends ItemDetailsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20000)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20000)
  height?: number;

  /** A small JPEG made on the phone for grids and lists. */
  @IsOptional()
  @IsString()
  @MaxLength(base64Length(MAX_THUMB_BYTES))
  @IsBase64()
  thumbData?: string;
}

export class UploadPhotoDto extends UploadDto {
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(base64Length(MAX_PHOTO_BYTES))
  @IsBase64()
  data!: string;
}

export class CreateDocumentDto extends UploadDto {
  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
  contentType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(base64Length(MAX_DOCUMENT_BYTES))
  @IsBase64()
  data!: string;
}
