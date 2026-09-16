-- Destructive model contraction. Before applying outside this reset development database,
-- confirm User, Person, TenantMembership, TenantInvitation,
-- ParentChildRelationship and Partnership are empty. Confirm every Tenant owns
-- exactly one Family. This migration preserves Family rows and public slugs, but
-- deliberately does not guess account ownership or parent/partnership semantics.
-- Stop old API instances before applying; MySQL DDL is not transactional.

ALTER TABLE `Family`
  ADD COLUMN `status` ENUM('ACTIVE', 'SUSPENDED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE';

UPDATE `Family` AS f
JOIN `Tenant` AS t ON t.`id` = f.`tenantId`
SET f.`slug` = t.`slug`,
    f.`name` = t.`name`,
    f.`description` = COALESCE(f.`description`, t.`description`),
    f.`status` = t.`status`;

ALTER TABLE `Family` DROP FOREIGN KEY `Family_tenantId_fkey`;
DROP INDEX `Family_tenantId_slug_key` ON `Family`;
DROP INDEX `Family_tenantId_isPrimary_idx` ON `Family`;
ALTER TABLE `Family`
  DROP COLUMN `tenantId`,
  DROP COLUMN `isPrimary`;
CREATE UNIQUE INDEX `Family_slug_key` ON `Family`(`slug`);
CREATE INDEX `Family_status_idx` ON `Family`(`status`);

ALTER TABLE `User`
  MODIFY `passwordHash` VARCHAR(255) NULL,
  MODIFY `status` ENUM('ACTIVE', 'INVITED', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN `role` ENUM('ADMIN', 'MEMBER_PLUS', 'MEMBER') NULL,
  ADD COLUMN `familyId` CHAR(36) NULL,
  ADD COLUMN `invitationTokenHash` CHAR(64) NULL,
  ADD COLUMN `invitationExpiresAt` DATETIME(3) NULL;

-- An existing User with no explicit role makes this contraction fail, rather
-- than silently granting ADMIN or attaching the account to an arbitrary Family.
ALTER TABLE `User`
  MODIFY `role` ENUM('ADMIN', 'MEMBER_PLUS', 'MEMBER') NOT NULL;
DROP INDEX `User_systemRole_status_idx` ON `User`;
ALTER TABLE `User` DROP COLUMN `systemRole`;
CREATE UNIQUE INDEX `User_invitationTokenHash_key` ON `User`(`invitationTokenHash`);
CREATE INDEX `User_familyId_role_status_idx` ON `User`(`familyId`, `role`, `status`);
ALTER TABLE `User`
  ADD CONSTRAINT `User_familyId_fkey`
    FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Person`
  ADD COLUMN `fatherId` CHAR(36) NULL,
  ADD COLUMN `motherId` CHAR(36) NULL;
ALTER TABLE `Person` DROP FOREIGN KEY `Person_tenantId_fkey`;
DROP INDEX `Person_tenantId_familyId_generation_idx` ON `Person`;
DROP INDEX `Person_tenantId_displayName_idx` ON `Person`;
ALTER TABLE `Person` DROP COLUMN `tenantId`;
CREATE UNIQUE INDEX `Person_familyId_id_key` ON `Person`(`familyId`, `id`);
CREATE INDEX `Person_familyId_fatherId_idx` ON `Person`(`familyId`, `fatherId`);
CREATE INDEX `Person_familyId_motherId_idx` ON `Person`(`familyId`, `motherId`);
CREATE INDEX `Person_familyId_generation_idx` ON `Person`(`familyId`, `generation`);
CREATE INDEX `Person_familyId_displayName_idx` ON `Person`(`familyId`, `displayName`);
ALTER TABLE `Person`
  ADD CONSTRAINT `Person_father_fkey`
    FOREIGN KEY (`familyId`, `fatherId`) REFERENCES `Person`(`familyId`, `id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `Person_mother_fkey`
    FOREIGN KEY (`familyId`, `motherId`) REFERENCES `Person`(`familyId`, `id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE `TenantInvitation`;
DROP TABLE `TenantMembership`;
DROP TABLE `ParentChildRelationship`;
DROP TABLE `Partnership`;
DROP TABLE `Tenant`;
