-- Family members (who share one account) propose changes to a Person; the clan head reviews them.
-- Suggestions belong to the Person's family and go away with the Person or the Family.

-- CreateTable
CREATE TABLE `EditSuggestion` (
    `id` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `personId` CHAR(36) NOT NULL,
    `proposerName` VARCHAR(100) NOT NULL,
    `content` TEXT NOT NULL,
    `status` ENUM('PENDING', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    INDEX `EditSuggestion_familyId_status_createdAt_idx`(`familyId`, `status`, `createdAt`),
    INDEX `EditSuggestion_familyId_personId_idx`(`familyId`, `personId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EditSuggestion` ADD CONSTRAINT `EditSuggestion_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EditSuggestion` ADD CONSTRAINT `EditSuggestion_person_fkey` FOREIGN KEY (`familyId`, `personId`) REFERENCES `Person`(`familyId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;
