-- Death dates become free text like birth dates: old ancestors often have only a year.
-- MODIFY keeps existing DATE values as `YYYY-MM-DD` text; rewrite them as Vietnamese `dd/mm/yyyy`.
ALTER TABLE `Person` MODIFY `deathDate` VARCHAR(100) NULL;

UPDATE `Person`
SET `deathDate` = CONCAT(SUBSTRING(`deathDate`, 9, 2), '/', SUBSTRING(`deathDate`, 6, 2), '/', SUBSTRING(`deathDate`, 1, 4))
WHERE `deathDate` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
