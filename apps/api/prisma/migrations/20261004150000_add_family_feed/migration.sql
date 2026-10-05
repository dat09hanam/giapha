-- Bảng tin: the family news feed. Posts, their photos, comments (one level of replies) and
-- reactions, all tenant-scoped through composite (familyId, id) foreign keys and removed with
-- their post or family.

-- CreateTable
CREATE TABLE `FeedPost` (
    `id` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `authorName` VARCHAR(100) NOT NULL,
    `authorKeyHash` CHAR(64) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `editedAt` DATETIME(3) NULL,

    INDEX `FeedPost_familyId_createdAt_idx`(`familyId`, `createdAt`),
    UNIQUE INDEX `FeedPost_familyId_id_key`(`familyId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeedImage` (
    `id` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `postId` CHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `width` SMALLINT UNSIGNED NOT NULL,
    `height` SMALLINT UNSIGNED NOT NULL,
    `sortOrder` TINYINT UNSIGNED NOT NULL,

    INDEX `FeedImage_familyId_postId_idx`(`familyId`, `postId`),
    INDEX `FeedImage_familyId_url_idx`(`familyId`, `url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeedComment` (
    `id` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `postId` CHAR(36) NOT NULL,
    `parentId` CHAR(36) NULL,
    `authorName` VARCHAR(100) NOT NULL,
    `authorKeyHash` CHAR(64) NOT NULL,
    `replyToName` VARCHAR(100) NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `editedAt` DATETIME(3) NULL,

    INDEX `FeedComment_familyId_postId_createdAt_idx`(`familyId`, `postId`, `createdAt`),
    INDEX `FeedComment_parentId_idx`(`parentId`),
    UNIQUE INDEX `FeedComment_familyId_id_key`(`familyId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeedReaction` (
    `id` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `postId` CHAR(36) NULL,
    `commentId` CHAR(36) NULL,
    `reactorKeyHash` CHAR(64) NOT NULL,
    `reactorName` VARCHAR(100) NOT NULL,
    `type` ENUM('LIKE', 'LOVE', 'CARE', 'HAHA', 'WOW', 'SAD', 'ANGRY') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FeedReaction_familyId_idx`(`familyId`),
    UNIQUE INDEX `FeedReaction_postId_reactorKeyHash_key`(`postId`, `reactorKeyHash`),
    UNIQUE INDEX `FeedReaction_commentId_reactorKeyHash_key`(`commentId`, `reactorKeyHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FeedPost` ADD CONSTRAINT `FeedPost_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedImage` ADD CONSTRAINT `FeedImage_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedImage` ADD CONSTRAINT `FeedImage_post_fkey` FOREIGN KEY (`familyId`, `postId`) REFERENCES `FeedPost`(`familyId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedComment` ADD CONSTRAINT `FeedComment_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedComment` ADD CONSTRAINT `FeedComment_post_fkey` FOREIGN KEY (`familyId`, `postId`) REFERENCES `FeedPost`(`familyId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedComment` ADD CONSTRAINT `FeedComment_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `FeedComment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedReaction` ADD CONSTRAINT `FeedReaction_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedReaction` ADD CONSTRAINT `FeedReaction_post_fkey` FOREIGN KEY (`familyId`, `postId`) REFERENCES `FeedPost`(`familyId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedReaction` ADD CONSTRAINT `FeedReaction_comment_fkey` FOREIGN KEY (`familyId`, `commentId`) REFERENCES `FeedComment`(`familyId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;
