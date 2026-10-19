-- Ambassador programme: people who refer families earn a fixed commission per plan, which the
-- admin records as paid after transferring it by bank.

-- AlterTable
ALTER TABLE `Family` ADD COLUMN `ambassadorId` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `PricingPlan` ADD COLUMN `commissionAmount` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `ServiceRegistration` ADD COLUMN `ambassadorCode` VARCHAR(12) NULL;

-- CreateTable
CREATE TABLE `Ambassador` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(12) NOT NULL,
    `fullName` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `adminNote` VARCHAR(1000) NULL,
    `consentAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Ambassador_code_key`(`code`),
    UNIQUE INDEX `Ambassador_email_key`(`email`),
    INDEX `Ambassador_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AmbassadorCommission` (
    `id` CHAR(36) NOT NULL,
    `ambassadorId` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `familyName` VARCHAR(191) NOT NULL,
    `planId` CHAR(36) NULL,
    `planName` VARCHAR(60) NOT NULL,
    `kind` ENUM('NEW_FAMILY', 'PLAN_CHANGE') NOT NULL,
    `amount` INTEGER NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `paidById` CHAR(36) NULL,
    `paidNote` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AmbassadorCommission_ambassadorId_paidAt_idx`(`ambassadorId`, `paidAt`),
    INDEX `AmbassadorCommission_paidAt_createdAt_idx`(`paidAt`, `createdAt`),
    INDEX `AmbassadorCommission_familyId_idx`(`familyId`),
    INDEX `AmbassadorCommission_planId_idx`(`planId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Family_ambassadorId_idx` ON `Family`(`ambassadorId`);

-- AddForeignKey
ALTER TABLE `Family` ADD CONSTRAINT `Family_ambassadorId_fkey` FOREIGN KEY (`ambassadorId`) REFERENCES `Ambassador`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AmbassadorCommission` ADD CONSTRAINT `AmbassadorCommission_ambassadorId_fkey` FOREIGN KEY (`ambassadorId`) REFERENCES `Ambassador`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AmbassadorCommission` ADD CONSTRAINT `AmbassadorCommission_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AmbassadorCommission` ADD CONSTRAINT `AmbassadorCommission_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `PricingPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AmbassadorCommission` ADD CONSTRAINT `AmbassadorCommission_paidById_fkey` FOREIGN KEY (`paidById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

