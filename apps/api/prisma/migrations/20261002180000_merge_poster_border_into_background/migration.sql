-- Merges the BORDER decoration kind into BACKGROUND: a sheet background now
-- carries its own frame. Built-in borders become framed sheets, uploaded border
-- art becomes stretched sheet art, and each family keeps the look of its border.

-- A family that chose a border now shows that border's sheet.
UPDATE `Family` SET `posterBackgroundId` = `posterBorderId` WHERE `posterBorderId` IS NOT NULL;

-- The frameless pattern-only built-ins are retired; families left on one fall back to plain paper.
UPDATE `Family` SET `posterBackgroundId` = '00000000-0000-4000-8000-000000000404'
    WHERE `posterBackgroundId` IN (
        '00000000-0000-4000-8000-000000000401',
        '00000000-0000-4000-8000-000000000402',
        '00000000-0000-4000-8000-000000000403'
    );
DELETE FROM `PosterDecoration` WHERE `id` IN (
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000402',
    '00000000-0000-4000-8000-000000000403'
);

-- AlterTable: allow the new STRETCH mode before borders are converted.
ALTER TABLE `PosterDecoration` MODIFY `backgroundMode` ENUM('TILE', 'COVER', 'STRETCH') NULL;

-- Border rows become sheet rows. Built-ins keep their IDs and keys; the web app now
-- draws each as its frame plus a paper pattern.
UPDATE `PosterDecoration`
    SET `kind` = 'BACKGROUND',
        `backgroundMode` = IF(`builtinKey` IS NULL, 'STRETCH', NULL),
        `name` = CASE `id`
            WHEN '00000000-0000-4000-8000-000000000101' THEN 'Chữ Công đỏ – vòng tròn'
            WHEN '00000000-0000-4000-8000-000000000102' THEN 'Viền kép vàng – mây lành'
            WHEN '00000000-0000-4000-8000-000000000103' THEN 'Sơn mài nâu – hoa sen'
            ELSE `name`
        END
    WHERE `kind` = 'BORDER';
UPDATE `PosterDecoration` SET `sortOrder` = 4 WHERE `id` = '00000000-0000-4000-8000-000000000404';

-- DropForeignKey
ALTER TABLE `Family` DROP FOREIGN KEY `Family_posterBorderId_fkey`;

-- AlterTable
ALTER TABLE `Family` DROP COLUMN `posterBorderId`;

-- AlterTable
ALTER TABLE `PosterDecoration` DROP COLUMN `borderSlice`,
    MODIFY `kind` ENUM('CENTER', 'SIDE', 'BACKGROUND') NOT NULL;
