export type UploadedMediaResponse = {
  fileName: string;
  /** Stored on `Person.avatarUrl`; carries no tenant or host information. */
  url: string;
};
