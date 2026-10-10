-- The plan catalog becomes: member cap, duration, data-entry support, printable book and
-- branch-manager cap. Site sections (feed, fund, merit, library, edit suggestions) are no longer
-- plan rights; every family has them, so their lines are removed from every plan.

DELETE FROM `PricingPlanFeature`
WHERE `key` IN ('feed', 'fund', 'merit', 'library', 'editSuggestions');

-- New required limit: start unlimited so no family loses accounts it already has.
INSERT INTO `PricingPlanFeature` (`id`, `planId`, `key`, `value`, `style`, `sortOrder`)
SELECT UUID(), `id`, 'maxManagers', NULL, 'NORMAL', 4 FROM `PricingPlan`;

-- New display-only option: not included until the ADMIN marks it.
INSERT INTO `PricingPlanFeature` (`id`, `planId`, `key`, `value`, `style`, `sortOrder`)
SELECT UUID(), `id`, 'dataEntrySupport', NULL, 'STRIKETHROUGH', 2 FROM `PricingPlan`;

-- Test data: the free plan is the one-month trial.
UPDATE `PricingPlanFeature`
JOIN `PricingPlan` ON `PricingPlan`.`id` = `PricingPlanFeature`.`planId`
SET `PricingPlanFeature`.`value` = 1
WHERE `PricingPlanFeature`.`key` = 'durationMonths' AND `PricingPlan`.`price` = 0;

-- Catalog order.
UPDATE `PricingPlanFeature`
SET `sortOrder` = CASE `key`
    WHEN 'maxMembers' THEN 0
    WHEN 'durationMonths' THEN 1
    WHEN 'dataEntrySupport' THEN 2
    WHEN 'printBook' THEN 3
    WHEN 'maxManagers' THEN 4
    ELSE `sortOrder`
END;
