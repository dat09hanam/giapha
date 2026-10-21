-- A family renews at the price it signed up for, kept even when the plan's price changes.
ALTER TABLE `Family` ADD COLUMN `planPrice` INTEGER NOT NULL DEFAULT 0;

UPDATE `Family` AS `f`
    JOIN `PricingPlan` AS `p` ON `p`.`id` = `f`.`planId`
SET `f`.`planPrice` = `p`.`price`;

-- Plan renewals paid by bank transfer (VietQR) and confirmed by the SePay webhook.
CREATE TABLE `PlanPayment` (
    `id` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `code` VARCHAR(24) NOT NULL,
    `planId` CHAR(36) NULL,
    `planName` VARCHAR(60) NOT NULL,
    `amount` INTEGER NOT NULL,
    `durationMonths` SMALLINT UNSIGNED NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'REVIEW') NOT NULL DEFAULT 'PENDING',
    `expiresAt` DATETIME(3) NOT NULL,
    `sepayTransactionId` VARCHAR(32) NULL,
    `paidAmount` INTEGER NULL,
    `paidAt` DATETIME(3) NULL,
    `extendedTo` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlanPayment_code_key`(`code`),
    UNIQUE INDEX `PlanPayment_sepayTransactionId_key`(`sepayTransactionId`),
    INDEX `PlanPayment_familyId_status_idx`(`familyId`, `status`),
    INDEX `PlanPayment_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `PlanPayment_planId_idx`(`planId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PlanPayment` ADD CONSTRAINT `PlanPayment_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PlanPayment` ADD CONSTRAINT `PlanPayment_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `PricingPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
