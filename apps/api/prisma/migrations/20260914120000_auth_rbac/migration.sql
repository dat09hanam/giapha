-- Deployment preflight: each tenant should have exactly one legacy OWNER.
-- Run and review before migration:
-- SELECT `tenantId`, SUM(`role` = 'OWNER') AS ownerCount
-- FROM `TenantMembership` GROUP BY `tenantId` HAVING ownerCount <> 1;
-- Coordinate downtime or an expand/backfill/contract rollout so old app instances
-- cannot write legacy role values while this migration narrows the enum.

-- Normalize legacy membership roles before narrowing the enum.
ALTER TABLE `TenantMembership`
  MODIFY `role` ENUM('OWNER', 'ADMIN', 'EDITOR', 'VIEWER', 'CLAN_HEAD', 'MEMBER')
  NOT NULL DEFAULT 'VIEWER';

UPDATE `TenantMembership`
SET `role` = CASE
  WHEN `role` = 'OWNER' THEN 'CLAN_HEAD'
  ELSE 'MEMBER'
END;

ALTER TABLE `TenantMembership`
  MODIFY `role` ENUM('CLAN_HEAD', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
  ADD COLUMN `status` ENUM('ACTIVE', 'REVOKED') NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX `TenantMembership_userId_status_role_idx`
  ON `TenantMembership`(`userId`, `status`, `role`);
-- The old index supports TenantMembership_userId_fkey until its replacement exists.
DROP INDEX `TenantMembership_userId_role_idx` ON `TenantMembership`;

ALTER TABLE `User`
  ADD COLUMN `systemRole` ENUM('USER', 'PLATFORM_ADMIN') NOT NULL DEFAULT 'USER',
  ADD COLUMN `status` ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX `User_systemRole_status_idx` ON `User`(`systemRole`, `status`);

CREATE TABLE `AuthSession` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `tokenHash` CHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `AuthSession_tokenHash_key`(`tokenHash`),
  INDEX `AuthSession_userId_expiresAt_idx`(`userId`, `expiresAt`),
  INDEX `AuthSession_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TenantInvitation` (
  `id` CHAR(36) NOT NULL,
  `tenantId` CHAR(36) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `tokenHash` CHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `acceptedAt` DATETIME(3) NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdByUserId` CHAR(36) NOT NULL,
  UNIQUE INDEX `TenantInvitation_tokenHash_key`(`tokenHash`),
  INDEX `TenantInvitation_tenantId_email_expiresAt_idx`(`tenantId`, `email`, `expiresAt`),
  INDEX `TenantInvitation_tenantId_createdByUserId_idx`(`tenantId`, `createdByUserId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AuthSession`
  ADD CONSTRAINT `AuthSession_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TenantInvitation`
  ADD CONSTRAINT `TenantInvitation_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TenantInvitation`
  ADD CONSTRAINT `TenantInvitation_tenantId_createdByUserId_fkey`
  FOREIGN KEY (`tenantId`, `createdByUserId`)
  REFERENCES `TenantMembership`(`tenantId`, `userId`) ON DELETE CASCADE ON UPDATE CASCADE;
