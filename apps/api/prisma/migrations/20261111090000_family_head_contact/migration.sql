-- The clan head's name and phone, kept for the platform admin's family list.
ALTER TABLE `Family`
    ADD COLUMN `headName` VARCHAR(100) NULL,
    ADD COLUMN `headPhone` VARCHAR(30) NULL;

-- Families whose clan head already sent a plan request take the contact from the latest one.
UPDATE `Family` AS `f`
SET `f`.`headName` = (
        SELECT `r`.`fullName` FROM `ServiceRegistration` AS `r`
        WHERE `r`.`familyId` = `f`.`id`
        ORDER BY `r`.`createdAt` DESC
        LIMIT 1
    ),
    `f`.`headPhone` = (
        SELECT `r`.`phone` FROM `ServiceRegistration` AS `r`
        WHERE `r`.`familyId` = `f`.`id`
        ORDER BY `r`.`createdAt` DESC
        LIMIT 1
    )
WHERE `f`.`isDemo` = FALSE;
