-- Plans carry enforceable limits: how long a purchase lasts (`durationMonths`, NULL = forever)
-- and how many people the tree may hold (`maxMembers`, NULL = unlimited). A family records when
-- its purchase ends; once past, the API moves it to EXPIRED until the ADMIN renews or changes it.

-- AlterTable
ALTER TABLE `PricingPlan` ADD COLUMN `durationMonths` INTEGER NULL,
    ADD COLUMN `maxMembers` INTEGER NULL;

-- AlterTable
ALTER TABLE `Family` ADD COLUMN `planExpiresAt` DATETIME(3) NULL,
    MODIFY `status` ENUM('ACTIVE', 'SUSPENDED', 'ARCHIVED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX `Family_status_planExpiresAt_idx` ON `Family`(`status`, `planExpiresAt`);

-- Test data: yearly plans last 12 months, and every non-demo family starts a fresh period now.
UPDATE `PricingPlan` SET `durationMonths` = 12 WHERE `billingPeriod` = 'năm';

UPDATE `Family`
JOIN `PricingPlan` ON `PricingPlan`.`id` = `Family`.`planId`
SET `Family`.`planExpiresAt` = DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL `PricingPlan`.`durationMonths` MONTH)
WHERE `Family`.`isDemo` = false AND `PricingPlan`.`durationMonths` IS NOT NULL;
