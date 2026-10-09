-- Birth dates become free text: old ancestors often have only a year, or "khoảng 1850".
-- MODIFY keeps existing DATE values as `YYYY-MM-DD` text; rewrite them as Vietnamese `dd/mm/yyyy`.
ALTER TABLE `Person` MODIFY `birthDate` VARCHAR(100) NULL;

UPDATE `Person`
SET `birthDate` = CONCAT(SUBSTRING(`birthDate`, 9, 2), '/', SUBSTRING(`birthDate`, 6, 2), '/', SUBSTRING(`birthDate`, 1, 4))
WHERE `birthDate` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
