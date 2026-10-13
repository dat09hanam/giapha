-- New required plan limit: how many megabytes a family's uploads may take (`maxStorageMb`,
-- NULL = unlimited). Every existing plan starts unlimited so no family is blocked by the upgrade;
-- the ADMIN sets each plan's quota afterwards.
INSERT INTO `PricingPlanFeature` (`id`, `planId`, `key`, `value`, `style`, `sortOrder`)
SELECT UUID(), `id`, 'maxStorageMb', NULL, 'NORMAL', 5 FROM `PricingPlan`;
