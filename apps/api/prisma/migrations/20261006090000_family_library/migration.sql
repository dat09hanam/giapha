-- Album và tư liệu dòng họ: the family library. Media (until now unused apart from its Person link)
-- becomes a photo in an album or a document, with its file details; Album groups photos.

-- AlterTable
ALTER TABLE `Media` ADD COLUMN `albumId` CHAR(36) NULL,
    ADD COLUMN `contentType` VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `height` SMALLINT UNSIGNED NULL,
    ADD COLUMN `kind` ENUM('PHOTO', 'DOCUMENT') NOT NULL DEFAULT 'PHOTO',
    ADD COLUMN `sizeBytes` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    ADD COLUMN `takenOn` DATE NULL,
    ADD COLUMN `thumbUrl` VARCHAR(500) NULL,
    ADD COLUMN `width` SMALLINT UNSIGNED NULL;

-- CreateTable
CREATE TABLE `Album` (
    `id` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Album_familyId_updatedAt_idx`(`familyId`, `updatedAt`),
    UNIQUE INDEX `Album_familyId_id_key`(`familyId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Media_familyId_albumId_createdAt_idx` ON `Media`(`familyId`, `albumId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Media_familyId_kind_createdAt_idx` ON `Media`(`familyId`, `kind`, `createdAt`);

-- AddForeignKey
ALTER TABLE `Media` ADD CONSTRAINT `Media_album_fkey` FOREIGN KEY (`familyId`, `albumId`) REFERENCES `Album`(`familyId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Album` ADD CONSTRAINT `Album_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
