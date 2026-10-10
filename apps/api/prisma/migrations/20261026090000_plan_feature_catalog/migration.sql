-- Plan feature lines stop being free text: each line is a catalog key (src/common/plan-rights.ts)
-- with an optional number, and it is the single source of a plan's rights. The separate
-- entitlement rows and limit columns are folded into lines and dropped. Existing lines are test
-- copy that no catalog key can represent, so they are rebuilt from the enforced data.

-- Rebuild lines from the rights each plan enforces today.
DELETE FROM `PricingPlanFeature`;

ALTER TABLE `PricingPlanFeature` DROP COLUMN `text`,
    ADD COLUMN `key` VARCHAR(50) NOT NULL,
    ADD COLUMN `value` INTEGER NULL;

CREATE UNIQUE INDEX `PricingPlanFeature_planId_key_key` ON `PricingPlanFeature`(`planId`, `key`);

INSERT INTO `PricingPlanFeature` (`id`, `planId`, `key`, `value`, `style`, `sortOrder`)
SELECT UUID(), `id`, 'durationMonths', `durationMonths`, 'NORMAL', 0 FROM `PricingPlan`;

INSERT INTO `PricingPlanFeature` (`id`, `planId`, `key`, `value`, `style`, `sortOrder`)
SELECT UUID(), `id`, 'maxMembers', `maxMembers`, 'BOLD', 1 FROM `PricingPlan`;

-- Every module appears on every plan: granted ones plainly, the rest struck through.
INSERT INTO `PricingPlanFeature` (`id`, `planId`, `key`, `value`, `style`, `sortOrder`)
SELECT UUID(), `PricingPlan`.`id`, `modules`.`key`, NULL,
    IF(`PricingPlanEntitlement`.`feature` IS NULL, 'STRIKETHROUGH', 'NORMAL'),
    `modules`.`sortOrder`
FROM `PricingPlan`
CROSS JOIN (
    SELECT 'feed' AS `key`, 2 AS `sortOrder`
    UNION ALL SELECT 'fund', 3
    UNION ALL SELECT 'merit', 4
    UNION ALL SELECT 'library', 5
    UNION ALL SELECT 'editSuggestions', 6
    UNION ALL SELECT 'printBook', 7
) AS `modules`
LEFT JOIN `PricingPlanEntitlement`
    ON `PricingPlanEntitlement`.`planId` = `PricingPlan`.`id`
    AND `PricingPlanEntitlement`.`feature` = `modules`.`key` COLLATE utf8mb4_unicode_ci;

-- DropTable
DROP TABLE `PricingPlanEntitlement`;

-- AlterTable
ALTER TABLE `PricingPlan` DROP COLUMN `durationMonths`,
    DROP COLUMN `maxMembers`;
