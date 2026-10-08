-- Mẫu bài cúng and Thư viện: platform-wide articles the platform ADMIN writes for the public
-- site. Not family data, so the table has no familyId.

-- CreateTable
CREATE TABLE `Article` (
    `id` CHAR(36) NOT NULL,
    `category` ENUM('PRAYER', 'LIBRARY') NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `summary` VARCHAR(500) NULL,
    `content` JSON NOT NULL,
    `coverFile` VARCHAR(64) NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Article_category_isPublished_publishedAt_idx`(`category`, `isPublished`, `publishedAt`),
    UNIQUE INDEX `Article_category_slug_key`(`category`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
