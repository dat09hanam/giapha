-- The platform's contact details, editable from /admin instead of hard-coded in the web app.
-- One row (id 1), seeded with the values the web app shipped with.

-- CreateTable
CREATE TABLE `SiteContact` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `phone` VARCHAR(30) NOT NULL,
    `zalo` VARCHAR(30) NULL,
    `email` VARCHAR(191) NOT NULL,
    `address` VARCHAR(200) NOT NULL,
    `hours` VARCHAR(100) NOT NULL,
    `facebookUrl` VARCHAR(500) NULL,
    `youtubeUrl` VARCHAR(500) NULL,
    `tiktokUrl` VARCHAR(500) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `SiteContact` (`id`, `phone`, `zalo`, `email`, `address`, `hours`, `updatedAt`)
VALUES (1, '0123 456 789', NULL, 'support@giaphaviet.vn', 'Hà Nội, Việt Nam', 'Hàng Ngày: 6:00 - 24:00', CURRENT_TIMESTAMP(3));
