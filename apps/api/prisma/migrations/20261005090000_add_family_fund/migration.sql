-- Quỹ họ: the family fund ledger. The clan head records income and expenses; the balance is
-- computed from these rows. Removed with the family.

-- CreateTable
CREATE TABLE `FundEntry` (
    `id` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `content` VARCHAR(500) NOT NULL,
    `kind` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `amount` BIGINT UNSIGNED NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FundEntry_familyId_createdAt_idx`(`familyId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FundEntry` ADD CONSTRAINT `FundEntry_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
