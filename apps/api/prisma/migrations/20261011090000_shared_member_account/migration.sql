-- The shared member account created with each family keeps its password (its username), so the
-- clan head cannot reset it. Marked explicitly because its name can no longer be recomputed once
-- the family is renamed.

-- AlterTable
ALTER TABLE `User` ADD COLUMN `isShared` BOOLEAN NOT NULL DEFAULT false;

-- Existing shared accounts: created with the family as `ThanhVien<Family><DDMM>`, named "Thành viên - <Family>".
UPDATE `User`
SET `isShared` = true
WHERE `role` = 'MEMBER'
  AND `username` LIKE 'ThanhVien%'
  AND `displayName` LIKE 'Thành viên - %';
