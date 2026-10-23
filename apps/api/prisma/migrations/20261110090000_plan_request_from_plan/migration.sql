-- A plan change request keeps the plan the family was on when it was sent.
ALTER TABLE `ServiceRegistration` ADD COLUMN `fromPlanName` VARCHAR(60) NULL;

-- Requests already sent: those still open take the family's current plan; confirmed ones cannot
-- be recovered and stay null.
UPDATE `ServiceRegistration` AS `r`
    JOIN `Family` AS `f` ON `f`.`id` = `r`.`familyId`
    JOIN `PricingPlan` AS `p` ON `p`.`id` = `f`.`planId`
SET `r`.`fromPlanName` = `p`.`name`
WHERE `r`.`status` IN ('NEW', 'CONTACTED');
