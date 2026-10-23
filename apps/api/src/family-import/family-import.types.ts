export type ImportSheet = 'people' | 'relationships';

/** A problem tied to one spreadsheet row, so the clan head can find and fix it. */
export type ImportIssue = {
  sheet: ImportSheet;
  /** Null for a problem with the file as a whole, such as the plan's member limit. */
  row: number | null;
  message: string;
};

export type FamilyImportResponse = {
  /** False when there are issues or the request was a dry run; nothing was written then. */
  imported: boolean;
  issues: ImportIssue[];
  peopleCount: number;
  /** Couples to create; ones the downloaded list repeats from the tree are not counted. */
  relationshipCount: number;
  /** People already in the tree; new rows are added beside them, never merged into them. */
  existingPeopleCount: number;
};
