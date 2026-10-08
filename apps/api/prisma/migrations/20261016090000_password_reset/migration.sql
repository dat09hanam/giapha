-- Quên mật khẩu: the clan head's email and the one-time codes mailed to it.

-- AlterTable
ALTER TABLE `User` ADD COLUMN `email` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `PasswordResetCode` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `codeHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PasswordResetCode_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `PasswordResetCode_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PasswordResetCode` ADD CONSTRAINT `PasswordResetCode_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

