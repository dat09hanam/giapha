-- The platform's public pricing table: service plans the platform ADMIN writes and their
-- feature lines. Not family data, so neither table has a familyId.

-- CreateTable
CREATE TABLE `PricingPlan` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `description` VARCHAR(200) NULL,
    `price` INTEGER NOT NULL DEFAULT 0,
    `billingPeriod` VARCHAR(20) NULL,
    `icon` VARCHAR(30) NOT NULL DEFAULT 'sprout',
    `tone` ENUM('WOOD', 'JADE', 'GOLD', 'LACQUER') NOT NULL DEFAULT 'WOOD',
    `badge` VARCHAR(40) NULL,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `ctaLabel` VARCHAR(40) NOT NULL,
    `ctaHref` VARCHAR(255) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PricingPlan_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingPlanFeature` (
    `id` CHAR(36) NOT NULL,
    `planId` CHAR(36) NOT NULL,
    `text` VARCHAR(160) NOT NULL,
    `style` ENUM('NORMAL', 'BOLD', 'STRIKETHROUGH') NOT NULL DEFAULT 'NORMAL',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `PricingPlanFeature_planId_sortOrder_idx`(`planId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PricingPlanFeature` ADD CONSTRAINT `PricingPlanFeature_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `PricingPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Four starting plans, so the home page has a table before the ADMIN edits it.
INSERT INTO `PricingPlan`
    (`id`, `name`, `description`, `price`, `billingPeriod`, `icon`, `tone`, `badge`, `isFeatured`, `ctaLabel`, `ctaHref`, `sortOrder`, `updatedAt`)
VALUES
    ('6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e01', 'Khởi Nguồn', 'Dành cho gia đình nhỏ muốn trải nghiệm.', 0, NULL, 'sprout', 'WOOD', NULL, false, 'Bắt đầu miễn phí', '#lien-he', 10, CURRENT_TIMESTAMP(3)),
    ('6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e02', 'Gắn Kết', 'Phù hợp cho gia đình, dòng họ nhỏ.', 199000, 'năm', 'bamboo', 'JADE', NULL, false, 'Đăng ký ngay', '#lien-he', 20, CURRENT_TIMESTAMP(3)),
    ('6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e03', 'Trường Tồn', 'Dành cho dòng họ nhiều thế hệ, đầy đủ tính năng.', 499000, 'năm', 'tree', 'GOLD', 'Phổ biến nhất', true, 'Đăng ký ngay', '#lien-he', 30, CURRENT_TIMESTAMP(3)),
    ('6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e04', 'Vĩnh Cửu', 'Dành cho đại gia tộc, không giới hạn thành viên.', 999000, 'năm', 'pagoda', 'LACQUER', NULL, false, 'Liên hệ tư vấn', '#lien-he', 40, CURRENT_TIMESTAMP(3));

INSERT INTO `PricingPlanFeature` (`id`, `planId`, `text`, `style`, `sortOrder`)
VALUES
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e01', 'Tối đa 30 người', 'BOLD', 1),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e01', '1 cây gia phả', 'NORMAL', 2),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e01', '100 MB lưu trữ', 'NORMAL', 3),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e01', 'Thông tin cơ bản', 'NORMAL', 4),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e01', 'Xem trên điện thoại', 'NORMAL', 5),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e01', 'Xuất PDF gia phả để in', 'STRIKETHROUGH', 6),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e02', 'Tối đa 300 người', 'BOLD', 1),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e02', '2 GB lưu trữ', 'NORMAL', 2),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e02', 'Tiểu sử, ảnh thành viên', 'NORMAL', 3),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e02', 'Ngày giỗ, ngày sinh', 'NORMAL', 4),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e02', 'Xuất ảnh gia phả (HD)', 'NORMAL', 5),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e02', 'Nhiều mẫu khung và nền', 'NORMAL', 6),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e02', 'Xuất PDF gia phả để in', 'STRIKETHROUGH', 7),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e03', 'Tối đa 2.000 người', 'BOLD', 1),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e03', '10 GB lưu trữ', 'NORMAL', 2),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e03', 'Nhật ký, lịch sử dòng họ', 'NORMAL', 3),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e03', 'Xuất PDF gia phả để in', 'BOLD', 4),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e03', 'Thống kê các thế hệ', 'NORMAL', 5),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e03', 'Tùy chỉnh giao diện, khung nền', 'NORMAL', 6),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e03', 'Sao lưu và xuất dữ liệu', 'NORMAL', 7),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e03', 'Hỗ trợ ưu tiên', 'NORMAL', 8),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e04', 'Không giới hạn số người', 'BOLD', 1),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e04', '50 GB lưu trữ', 'NORMAL', 2),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e04', 'Tên miền riêng (ví dụ: hoten.vn)', 'BOLD', 3),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e04', 'Phân quyền nâng cao', 'NORMAL', 4),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e04', 'Tất cả mẫu khung và nền', 'NORMAL', 5),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e04', 'Xuất dữ liệu đầy đủ', 'NORMAL', 6),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e04', 'Hỗ trợ ưu tiên 24/7', 'NORMAL', 7),
    (UUID(), '6b0f3c1e-2a51-4c8e-9d61-0a1b2c3d4e04', 'Tư vấn thiết kế gia phả theo yêu cầu', 'NORMAL', 8);
