-- Restore the invariant the API now maintains: a non-demo family has an expiry date exactly when
-- its plan has a duration. Families moved onto a plan before it had a duration start a period
-- today; families on a permanent plan lose a stale expiry date and are reopened if it locked them.

UPDATE `Family`
JOIN `PricingPlanFeature`
    ON `PricingPlanFeature`.`planId` = `Family`.`planId`
    AND `PricingPlanFeature`.`key` = 'durationMonths'
SET `Family`.`planExpiresAt` =
    DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL `PricingPlanFeature`.`value` MONTH)
WHERE `Family`.`isDemo` = false
    AND `Family`.`planExpiresAt` IS NULL
    AND `PricingPlanFeature`.`value` IS NOT NULL;

UPDATE `Family`
JOIN `PricingPlanFeature`
    ON `PricingPlanFeature`.`planId` = `Family`.`planId`
    AND `PricingPlanFeature`.`key` = 'durationMonths'
SET `Family`.`planExpiresAt` = NULL,
    `Family`.`status` = IF(`Family`.`status` = 'EXPIRED', 'ACTIVE', `Family`.`status`)
WHERE `PricingPlanFeature`.`value` IS NULL;
