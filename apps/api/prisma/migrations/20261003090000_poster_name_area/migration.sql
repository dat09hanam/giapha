-- A background can mark where the family name is written over its art, optionally along a curve.

-- AlterTable
ALTER TABLE `PosterDecoration` ADD COLUMN `nameInsetTop` TINYINT UNSIGNED NULL,
    ADD COLUMN `nameInsetRight` TINYINT UNSIGNED NULL,
    ADD COLUMN `nameInsetBottom` TINYINT UNSIGNED NULL,
    ADD COLUMN `nameInsetLeft` TINYINT UNSIGNED NULL,
    ADD COLUMN `nameCurve` TINYINT NOT NULL DEFAULT 0,
    ADD COLUMN `nameColor` VARCHAR(7) NOT NULL DEFAULT '#ffd83a';
