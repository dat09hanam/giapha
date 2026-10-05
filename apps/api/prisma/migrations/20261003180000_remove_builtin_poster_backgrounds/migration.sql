-- The background library now holds only uploaded images. Families showing a built-in background
-- fall back to plain paper through the foreign key's ON DELETE SET NULL.
DELETE FROM `PosterDecoration` WHERE `builtinKey` IS NOT NULL;

-- DropIndex
DROP INDEX `PosterDecoration_kind_builtinKey_key` ON `PosterDecoration`;

-- AlterTable
ALTER TABLE `PosterDecoration` DROP COLUMN `builtinKey`;
