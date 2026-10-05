-- The family head puts a member account in charge of a chi/nhánh rooted at one Person.
-- Assignments go away with the Family, the account, or the root Person.

-- CreateTable
CREATE TABLE `BranchManager` (
    `id` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `rootPersonId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BranchManager_userId_idx`(`userId`),
    UNIQUE INDEX `BranchManager_familyId_rootPersonId_key`(`familyId`, `rootPersonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BranchManager` ADD CONSTRAINT `BranchManager_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BranchManager` ADD CONSTRAINT `BranchManager_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BranchManager` ADD CONSTRAINT `BranchManager_root_fkey` FOREIGN KEY (`familyId`, `rootPersonId`) REFERENCES `Person`(`familyId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

