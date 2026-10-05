-- Moves phả đồ decoration from fixed preset keys on Family to a platform-wide
-- library the ADMIN manages. Each family's current choice is carried over
-- before the old key columns are dropped.

-- CreateTable
CREATE TABLE `PosterDecoration` (
    `id` CHAR(36) NOT NULL,
    `kind` ENUM('BORDER', 'CENTER', 'SIDE', 'BACKGROUND') NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `builtinKey` VARCHAR(32) NULL,
    `imageFile` VARCHAR(64) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `borderSlice` TINYINT UNSIGNED NULL,
    `showTitle` BOOLEAN NOT NULL DEFAULT true,
    `textColor` VARCHAR(7) NULL,
    `mirror` BOOLEAN NOT NULL DEFAULT true,
    `backgroundMode` ENUM('TILE', 'COVER') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `PosterDecoration_kind_isActive_sortOrder_idx`(`kind`, `isActive`, `sortOrder`),
    UNIQUE INDEX `PosterDecoration_kind_builtinKey_key`(`kind`, `builtinKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Built-in decorations, drawn by the web app. Fixed IDs keep them stable across environments.
INSERT INTO `PosterDecoration` (`id`, `kind`, `name`, `builtinKey`, `sortOrder`, `updatedAt`) VALUES
    ('00000000-0000-4000-8000-000000000101', 'BORDER', 'Hoa văn chữ Công đỏ', 'red-key', 1, CURRENT_TIMESTAMP(3)),
    ('00000000-0000-4000-8000-000000000102', 'BORDER', 'Viền kép vàng', 'gold-double', 2, CURRENT_TIMESTAMP(3)),
    ('00000000-0000-4000-8000-000000000103', 'BORDER', 'Sơn mài nâu', 'brown-lacquer', 3, CURRENT_TIMESTAMP(3)),
    ('00000000-0000-4000-8000-000000000201', 'CENTER', 'Băng đỏ', 'ribbon', 1, CURRENT_TIMESTAMP(3)),
    ('00000000-0000-4000-8000-000000000202', 'CENTER', 'Cuốn thư', 'scroll', 2, CURRENT_TIMESTAMP(3)),
    ('00000000-0000-4000-8000-000000000203', 'CENTER', 'Hoành phi', 'plaque', 3, CURRENT_TIMESTAMP(3)),
    ('00000000-0000-4000-8000-000000000301', 'SIDE', 'Cành mai', 'plum', 1, CURRENT_TIMESTAMP(3)),
    ('00000000-0000-4000-8000-000000000302', 'SIDE', 'Mây lành', 'cloud', 2, CURRENT_TIMESTAMP(3)),
    ('00000000-0000-4000-8000-000000000303', 'SIDE', 'Đèn lồng', 'lantern', 3, CURRENT_TIMESTAMP(3)),
    ('00000000-0000-4000-8000-000000000401', 'BACKGROUND', 'Vòng tròn đồng tâm', 'rosette', 1, CURRENT_TIMESTAMP(3)),
    ('00000000-0000-4000-8000-000000000402', 'BACKGROUND', 'Hoa văn mây', 'cloud', 2, CURRENT_TIMESTAMP(3)),
    ('00000000-0000-4000-8000-000000000403', 'BACKGROUND', 'Hoa sen', 'lotus', 3, CURRENT_TIMESTAMP(3)),
    ('00000000-0000-4000-8000-000000000404', 'BACKGROUND', 'Giấy trơn', 'plain', 4, CURRENT_TIMESTAMP(3));

-- AlterTable
ALTER TABLE `Family`
    ADD COLUMN `posterBorderId` CHAR(36) NULL,
    ADD COLUMN `posterCenterId` CHAR(36) NULL,
    ADD COLUMN `posterSideId` CHAR(36) NULL,
    ADD COLUMN `posterBackgroundId` CHAR(36) NULL;

-- Carry each family's preset choice over; the old side key `none` maps to no decoration.
UPDATE `Family` f JOIN `PosterDecoration` d ON d.`kind` = 'BORDER' AND d.`builtinKey` = f.`posterBorder`
    SET f.`posterBorderId` = d.`id`;
UPDATE `Family` f JOIN `PosterDecoration` d ON d.`kind` = 'CENTER' AND d.`builtinKey` = f.`posterCenter`
    SET f.`posterCenterId` = d.`id`;
UPDATE `Family` f JOIN `PosterDecoration` d ON d.`kind` = 'SIDE' AND d.`builtinKey` = f.`posterSide`
    SET f.`posterSideId` = d.`id`;
UPDATE `Family` f JOIN `PosterDecoration` d ON d.`kind` = 'BACKGROUND' AND d.`builtinKey` = f.`posterBackground`
    SET f.`posterBackgroundId` = d.`id`;

-- AlterTable
ALTER TABLE `Family`
    DROP COLUMN `posterBorder`,
    DROP COLUMN `posterCenter`,
    DROP COLUMN `posterSide`,
    DROP COLUMN `posterBackground`;

-- AddForeignKey
ALTER TABLE `Family` ADD CONSTRAINT `Family_posterBorderId_fkey` FOREIGN KEY (`posterBorderId`) REFERENCES `PosterDecoration`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Family` ADD CONSTRAINT `Family_posterCenterId_fkey` FOREIGN KEY (`posterCenterId`) REFERENCES `PosterDecoration`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Family` ADD CONSTRAINT `Family_posterSideId_fkey` FOREIGN KEY (`posterSideId`) REFERENCES `PosterDecoration`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Family` ADD CONSTRAINT `Family_posterBackgroundId_fkey` FOREIGN KEY (`posterBackgroundId`) REFERENCES `PosterDecoration`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
