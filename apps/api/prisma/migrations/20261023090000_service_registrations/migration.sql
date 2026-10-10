-- Sign-up requests sent from the home page's pricing table. Platform-level: a request comes
-- before any family exists, so the table has no familyId. Only the platform ADMIN reads it.

-- CreateTable
CREATE TABLE `ServiceRegistration` (
    `id` CHAR(36) NOT NULL,
    `planId` CHAR(36) NULL,
    `planName` VARCHAR(60) NOT NULL,
    `fullName` VARCHAR(100) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `consentAt` DATETIME(3) NOT NULL,
    `status` ENUM('NEW', 'CONTACTED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'NEW',
    `adminNote` VARCHAR(1000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceRegistration_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `ServiceRegistration_planId_idx`(`planId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ServiceRegistration` ADD CONSTRAINT `ServiceRegistration_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `PricingPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
