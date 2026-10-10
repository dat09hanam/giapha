-- Plans now carry enforceable feature entitlements, and every family records the plan it bought.
-- A family's effective features are the platform switches AND its plan's entitlements.

-- CreateTable
CREATE TABLE `PricingPlanEntitlement` (
    `planId` CHAR(36) NOT NULL,
    `feature` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`planId`, `feature`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PricingPlanEntitlement` ADD CONSTRAINT `PricingPlanEntitlement_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `PricingPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing plans start with every feature; the ADMIN narrows them afterwards.
INSERT INTO `PricingPlanEntitlement` (`planId`, `feature`)
SELECT `PricingPlan`.`id`, `features`.`feature`
FROM `PricingPlan`
CROSS JOIN (
    SELECT 'feed' AS `feature`
    UNION ALL SELECT 'fund'
    UNION ALL SELECT 'merit'
    UNION ALL SELECT 'library'
    UNION ALL SELECT 'editSuggestions'
    UNION ALL SELECT 'printBook'
) AS `features`;

-- AlterTable: families so far are test data, so they all move onto the last-listed plan.
ALTER TABLE `Family` ADD COLUMN `planId` CHAR(36) NULL;

UPDATE `Family`
SET `planId` = (
    SELECT `id` FROM `PricingPlan` ORDER BY `sortOrder` DESC, `createdAt` DESC LIMIT 1
);

ALTER TABLE `Family` MODIFY `planId` CHAR(36) NOT NULL;

-- CreateIndex
CREATE INDEX `Family_planId_idx` ON `Family`(`planId`);

-- AddForeignKey
ALTER TABLE `Family` ADD CONSTRAINT `Family_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `PricingPlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
