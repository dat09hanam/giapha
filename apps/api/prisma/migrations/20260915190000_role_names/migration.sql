-- Coordinated rollout: stop old API instances before contracting these enums.
-- Preserve existing role data by introducing new labels before removing old ones.
ALTER TABLE `User`
  MODIFY `systemRole` ENUM('USER', 'PLATFORM_ADMIN', 'ADMIN') NOT NULL DEFAULT 'USER';

UPDATE `User` SET `systemRole` = 'ADMIN' WHERE `systemRole` = 'PLATFORM_ADMIN';

ALTER TABLE `User`
  MODIFY `systemRole` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER';

ALTER TABLE `TenantMembership`
  MODIFY `role` ENUM('CLAN_HEAD', 'MEMBER_PLUS', 'MEMBER') NOT NULL DEFAULT 'MEMBER';

UPDATE `TenantMembership` SET `role` = 'MEMBER_PLUS' WHERE `role` = 'CLAN_HEAD';

ALTER TABLE `TenantMembership`
  MODIFY `role` ENUM('MEMBER_PLUS', 'MEMBER') NOT NULL DEFAULT 'MEMBER';
