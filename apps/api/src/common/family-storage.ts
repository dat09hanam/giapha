import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

export const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * Bytes a family's uploads take on disk: every file in its media folder, so avatars, feed
 * images, library photos, documents and thumbnails all count, whichever table points at them.
 */
export async function familyStorageBytes(mediaRoot: string, familyId: string): Promise<number> {
  const directory = join(mediaRoot, familyId);
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return 0;
  }
  const sizes = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map((entry) =>
        stat(join(directory, entry.name)).then(
          (info) => info.size,
          () => 0,
        ),
      ),
  );
  return sizes.reduce((total, size) => total + size, 0);
}
