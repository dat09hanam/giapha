-- The sheet background is now the phả đồ's only decoration: center and side art, couplets and
-- the title are retired. Their library rows are deleted; uploaded image files for them are left
-- in MEDIA_ROOT/poster-decorations/ and may be removed by hand.

-- DropForeignKey
ALTER TABLE `Family` DROP FOREIGN KEY `Family_posterCenterId_fkey`;

-- DropForeignKey
ALTER TABLE `Family` DROP FOREIGN KEY `Family_posterSideId_fkey`;

-- AlterTable
ALTER TABLE `Family` DROP COLUMN `posterCenterId`,
    DROP COLUMN `posterSideId`,
    DROP COLUMN `posterCoupletLeft`,
    DROP COLUMN `posterCoupletRight`,
    DROP COLUMN `posterTitle`,
    DROP COLUMN `posterSubtitle`;

-- Center and side decorations are no longer drawn anywhere.
DELETE FROM `PosterDecoration` WHERE `kind` IN ('CENTER', 'SIDE');

-- AlterTable
ALTER TABLE `PosterDecoration` DROP COLUMN `showTitle`,
    DROP COLUMN `textColor`,
    DROP COLUMN `mirror`,
    MODIFY `kind` ENUM('BACKGROUND') NOT NULL;
