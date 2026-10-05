-- Uploaded sheets can mark the art painted along their edges so the tree keeps clear of it,
-- center art can mark where its title is written, and each family writes its own title.

-- AlterTable
ALTER TABLE `PosterDecoration` ADD COLUMN `insetTop` TINYINT UNSIGNED NULL,
    ADD COLUMN `insetRight` TINYINT UNSIGNED NULL,
    ADD COLUMN `insetBottom` TINYINT UNSIGNED NULL,
    ADD COLUMN `insetLeft` TINYINT UNSIGNED NULL;

-- AlterTable
ALTER TABLE `Family` ADD COLUMN `posterTitle` VARCHAR(60) NOT NULL DEFAULT 'Phả đồ',
    ADD COLUMN `posterSubtitle` VARCHAR(120) NULL;
