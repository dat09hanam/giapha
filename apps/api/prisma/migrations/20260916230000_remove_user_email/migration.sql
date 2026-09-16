-- Remove legacy email values that were previously copied into usernames.
UPDATE `User`
SET `username` = CASE `role`
  WHEN 'ADMIN' THEN CONCAT('LegacyAdmin', REPLACE(`id`, '-', ''))
  WHEN 'MEMBER_PLUS' THEN CONCAT('LegacyTruongHo', REPLACE(`id`, '-', ''))
  ELSE CONCAT('LegacyThanhVien', REPLACE(`id`, '-', ''))
END
WHERE `email` IS NOT NULL
  AND `username` = `email`;

DROP INDEX `User_email_key` ON `User`;

ALTER TABLE `User` DROP COLUMN `email`;
