-- Families provide two optional couplet lines; backgrounds define where each vertical line is drawn.

-- AlterTable
ALTER TABLE `Family` ADD COLUMN `posterLeftText` VARCHAR(191) NULL,
    ADD COLUMN `posterRightText` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `PosterDecoration` ADD COLUMN `leftTextInsetTop` TINYINT UNSIGNED NULL,
    ADD COLUMN `leftTextInsetRight` TINYINT UNSIGNED NULL,
    ADD COLUMN `leftTextInsetBottom` TINYINT UNSIGNED NULL,
    ADD COLUMN `leftTextInsetLeft` TINYINT UNSIGNED NULL,
    ADD COLUMN `leftTextColor` VARCHAR(7) NOT NULL DEFAULT '#ffd83a',
    ADD COLUMN `rightTextInsetTop` TINYINT UNSIGNED NULL,
    ADD COLUMN `rightTextInsetRight` TINYINT UNSIGNED NULL,
    ADD COLUMN `rightTextInsetBottom` TINYINT UNSIGNED NULL,
    ADD COLUMN `rightTextInsetLeft` TINYINT UNSIGNED NULL,
    ADD COLUMN `rightTextColor` VARCHAR(7) NOT NULL DEFAULT '#ffd83a';
