/*
  Warnings:

  - You are about to drop the column `displayName` on the `Person` table. All the data in the column will be lost.
  - You are about to drop the column `familyName` on the `Person` table. All the data in the column will be lost.
  - You are about to drop the column `givenName` on the `Person` table. All the data in the column will be lost.
  - Added the required column `name` to the `Person` table without a default value. This is not possible if the table is not empty.

*/
-- `Person.displayName` is replaced by `Person.name`, and the development data was
-- explicitly discardable. Existing rows are removed so no Person keeps an empty name.
UPDATE `Person` SET `fatherId` = NULL, `motherId` = NULL;
DELETE FROM `Person`;

-- DropForeignKey
ALTER TABLE `Person` DROP FOREIGN KEY `Person_familyId_fkey`;

-- DropIndex
DROP INDEX `Person_familyId_displayName_idx` ON `Person`;

-- AlterTable
ALTER TABLE `Family` ADD COLUMN `address` VARCHAR(255) NULL,
    ADD COLUMN `ancestryOrigin` VARCHAR(255) NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Person` DROP COLUMN `displayName`,
    DROP COLUMN `familyName`,
    DROP COLUMN `givenName`,
    ADD COLUMN `burialPlace` VARCHAR(255) NULL,
    ADD COLUMN `courtesyName` VARCHAR(191) NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `isAlive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `lunarDeathDay` TINYINT UNSIGNED NULL,
    ADD COLUMN `lunarDeathMonth` TINYINT UNSIGNED NULL,
    ADD COLUMN `name` VARCHAR(191) NOT NULL,
    ADD COLUMN `nickname` VARCHAR(191) NULL,
    ADD COLUMN `orderInFamily` SMALLINT UNSIGNED NULL,
    ADD COLUMN `phone` VARCHAR(30) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `Relationship` (
    `id` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `husbandId` CHAR(36) NOT NULL,
    `wifeId` CHAR(36) NOT NULL,
    `marriageDate` DATE NULL,
    `status` ENUM('MARRIED', 'SEPARATED', 'DIVORCED', 'WIDOWED') NOT NULL DEFAULT 'MARRIED',
    `wifeOrder` TINYINT UNSIGNED NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Relationship_familyId_husbandId_wifeOrder_idx`(`familyId`, `husbandId`, `wifeOrder`),
    INDEX `Relationship_familyId_wifeId_idx`(`familyId`, `wifeId`),
    INDEX `Relationship_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `Relationship_familyId_husbandId_wifeId_key`(`familyId`, `husbandId`, `wifeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Media` (
    `id` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `personId` CHAR(36) NULL,
    `fileUrl` VARCHAR(500) NOT NULL,
    `title` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'HIDDEN') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Media_familyId_status_idx`(`familyId`, `status`),
    INDEX `Media_familyId_personId_idx`(`familyId`, `personId`),
    INDEX `Media_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Family_deletedAt_idx` ON `Family`(`deletedAt`);

-- CreateIndex
CREATE INDEX `Person_familyId_name_idx` ON `Person`(`familyId`, `name`);

-- CreateIndex
CREATE INDEX `Person_familyId_lunarDeathMonth_lunarDeathDay_idx` ON `Person`(`familyId`, `lunarDeathMonth`, `lunarDeathDay`);

-- CreateIndex
CREATE INDEX `Person_deletedAt_idx` ON `Person`(`deletedAt`);

-- CreateIndex
CREATE INDEX `User_deletedAt_idx` ON `User`(`deletedAt`);

-- AddForeignKey
-- Re-created after the Person index rebuild above dropped it.
ALTER TABLE `Person` ADD CONSTRAINT `Person_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Relationship` ADD CONSTRAINT `Relationship_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Relationship` ADD CONSTRAINT `Relationship_husband_fkey` FOREIGN KEY (`familyId`, `husbandId`) REFERENCES `Person`(`familyId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Relationship` ADD CONSTRAINT `Relationship_wife_fkey` FOREIGN KEY (`familyId`, `wifeId`) REFERENCES `Person`(`familyId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Media` ADD CONSTRAINT `Media_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Media` ADD CONSTRAINT `Media_person_fkey` FOREIGN KEY (`familyId`, `personId`) REFERENCES `Person`(`familyId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;
