-- Email reminders of a person's death anniversary (ngày giỗ), sent a week ahead.
CREATE TABLE `AnniversaryReminder` (
    `id` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `personId` CHAR(36) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `createdById` CHAR(36) NULL,
    `unsubscribeToken` VARCHAR(64) NOT NULL,
    `lastSentFor` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AnniversaryReminder_unsubscribeToken_key`(`unsubscribeToken`),
    INDEX `AnniversaryReminder_familyId_createdById_idx`(`familyId`, `createdById`),
    INDEX `AnniversaryReminder_createdById_idx`(`createdById`),
    UNIQUE INDEX `AnniversaryReminder_personId_email_key`(`personId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AnniversaryReminder` ADD CONSTRAINT `AnniversaryReminder_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AnniversaryReminder` ADD CONSTRAINT `AnniversaryReminder_person_fkey` FOREIGN KEY (`familyId`, `personId`) REFERENCES `Person`(`familyId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AnniversaryReminder` ADD CONSTRAINT `AnniversaryReminder_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

