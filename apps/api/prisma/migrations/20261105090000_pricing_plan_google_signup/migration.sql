-- The plan Google self-service sign-up opens families on; the admin turns it on for one plan.
ALTER TABLE `PricingPlan`
    ADD COLUMN `googleSignup` BOOLEAN NOT NULL DEFAULT false;

-- Keep today's behaviour: sign-up used the first visible free plan in display order.
UPDATE `PricingPlan` AS `p`
    INNER JOIN (
        SELECT `id`
        FROM `PricingPlan`
        WHERE `isActive` = true AND `price` = 0
        ORDER BY `sortOrder` ASC, `createdAt` ASC
        LIMIT 1
    ) AS `first_free` ON `first_free`.`id` = `p`.`id`
SET `p`.`googleSignup` = true;
