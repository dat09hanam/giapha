-- Ambassador commission becomes a percent of the plan price instead of a fixed amount.

-- A plan's fixed amount turns into the nearest whole percent of its price (free plans earn none).
ALTER TABLE `PricingPlan`
    ADD COLUMN `commissionPercent` TINYINT UNSIGNED NOT NULL DEFAULT 0;

UPDATE `PricingPlan`
SET `commissionPercent` = LEAST(100, ROUND(`commissionAmount` * 100 / `price`))
WHERE `price` > 0 AND `commissionAmount` > 0;

ALTER TABLE `PricingPlan` DROP COLUMN `commissionAmount`;

-- Commissions already earned keep their amount; price and percent are filled from the plan.
ALTER TABLE `AmbassadorCommission`
    ADD COLUMN `percent` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    ADD COLUMN `planPrice` INTEGER NOT NULL DEFAULT 0;

UPDATE `AmbassadorCommission` AS `c`
    LEFT JOIN `PricingPlan` AS `p` ON `p`.`id` = `c`.`planId`
SET `c`.`planPrice` = COALESCE(`p`.`price`, 0),
    `c`.`percent` = CASE
        WHEN `p`.`price` > 0 THEN LEAST(100, ROUND(`c`.`amount` * 100 / `p`.`price`))
        ELSE 0
    END;

ALTER TABLE `AmbassadorCommission`
    ALTER COLUMN `percent` DROP DEFAULT,
    ALTER COLUMN `planPrice` DROP DEFAULT;
