-- CreateTable
CREATE TABLE `Tenant` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Tenant_slug_key`(`slug`),
    INDEX `Tenant_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TenantMembership` (
    `tenantId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'EDITOR', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TenantMembership_userId_role_idx`(`userId`, `role`),
    PRIMARY KEY (`tenantId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Family` (
    `id` CHAR(36) NOT NULL,
    `tenantId` CHAR(36) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Family_tenantId_isPrimary_idx`(`tenantId`, `isPrimary`),
    UNIQUE INDEX `Family_tenantId_slug_key`(`tenantId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Person` (
    `id` CHAR(36) NOT NULL,
    `tenantId` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `givenName` VARCHAR(100) NULL,
    `familyName` VARCHAR(100) NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `birthDate` DATE NULL,
    `deathDate` DATE NULL,
    `avatarUrl` VARCHAR(500) NULL,
    `biography` TEXT NULL,
    `generation` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Person_tenantId_familyId_generation_idx`(`tenantId`, `familyId`, `generation`),
    INDEX `Person_tenantId_displayName_idx`(`tenantId`, `displayName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ParentChildRelationship` (
    `id` CHAR(36) NOT NULL,
    `tenantId` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `parentId` CHAR(36) NOT NULL,
    `childId` CHAR(36) NOT NULL,
    `type` ENUM('BIOLOGICAL', 'ADOPTIVE', 'STEP', 'FOSTER', 'GUARDIAN') NOT NULL DEFAULT 'BIOLOGICAL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ParentChildRelationship_tenantId_familyId_parentId_idx`(`tenantId`, `familyId`, `parentId`),
    INDEX `ParentChildRelationship_tenantId_familyId_childId_idx`(`tenantId`, `familyId`, `childId`),
    UNIQUE INDEX `ParentChildRelationship_parentId_childId_key`(`parentId`, `childId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Partnership` (
    `id` CHAR(36) NOT NULL,
    `tenantId` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `partnerAId` CHAR(36) NOT NULL,
    `partnerBId` CHAR(36) NOT NULL,
    `status` ENUM('MARRIED', 'PARTNERED', 'SEPARATED', 'DIVORCED', 'WIDOWED') NOT NULL DEFAULT 'MARRIED',
    `startedAt` DATE NULL,
    `endedAt` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Partnership_tenantId_familyId_idx`(`tenantId`, `familyId`),
    UNIQUE INDEX `Partnership_partnerAId_partnerBId_key`(`partnerAId`, `partnerBId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TenantMembership` ADD CONSTRAINT `TenantMembership_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TenantMembership` ADD CONSTRAINT `TenantMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Family` ADD CONSTRAINT `Family_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Person` ADD CONSTRAINT `Person_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Person` ADD CONSTRAINT `Person_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParentChildRelationship` ADD CONSTRAINT `ParentChildRelationship_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParentChildRelationship` ADD CONSTRAINT `ParentChildRelationship_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParentChildRelationship` ADD CONSTRAINT `ParentChildRelationship_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParentChildRelationship` ADD CONSTRAINT `ParentChildRelationship_childId_fkey` FOREIGN KEY (`childId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partnership` ADD CONSTRAINT `Partnership_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partnership` ADD CONSTRAINT `Partnership_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partnership` ADD CONSTRAINT `Partnership_partnerAId_fkey` FOREIGN KEY (`partnerAId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partnership` ADD CONSTRAINT `Partnership_partnerBId_fkey` FOREIGN KEY (`partnerBId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

