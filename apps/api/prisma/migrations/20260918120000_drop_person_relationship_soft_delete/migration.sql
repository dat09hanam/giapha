-- Person and Relationship stop being soft-deleted. Purge the rows that were
-- already flagged so dropping the column does not resurrect them as junk data.

DELETE FROM `Relationship` WHERE `deletedAt` IS NOT NULL;

UPDATE `Person` SET `fatherId` = NULL
WHERE `fatherId` IN (
    SELECT `id` FROM (SELECT `id` FROM `Person` WHERE `deletedAt` IS NOT NULL) AS `softDeletedFathers`
);

UPDATE `Person` SET `motherId` = NULL
WHERE `motherId` IN (
    SELECT `id` FROM (SELECT `id` FROM `Person` WHERE `deletedAt` IS NOT NULL) AS `softDeletedMothers`
);

UPDATE `Media` SET `personId` = NULL
WHERE `personId` IN (SELECT `id` FROM `Person` WHERE `deletedAt` IS NOT NULL);

DELETE FROM `Relationship`
WHERE `husbandId` IN (SELECT `id` FROM `Person` WHERE `deletedAt` IS NOT NULL)
   OR `wifeId` IN (SELECT `id` FROM `Person` WHERE `deletedAt` IS NOT NULL);

DELETE FROM `Person` WHERE `deletedAt` IS NOT NULL;

-- DropIndex
DROP INDEX `Person_deletedAt_idx` ON `Person`;

-- DropIndex
DROP INDEX `Relationship_deletedAt_idx` ON `Relationship`;

-- AlterTable
ALTER TABLE `Person` DROP COLUMN `deletedAt`;

-- AlterTable
ALTER TABLE `Relationship` DROP COLUMN `deletedAt`;
