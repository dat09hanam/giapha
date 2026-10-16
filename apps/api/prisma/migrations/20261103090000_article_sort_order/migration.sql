-- Admin-chosen order of articles within each category (Mẫu bài cúng, Thư viện).
ALTER TABLE `Article`
    ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0;

-- Number the existing articles in the order the public lists already show them (newest
-- publication first, drafts last), so nothing moves on the site when this ships.
UPDATE `Article` AS `a`
    INNER JOIN (
        SELECT `id`,
               ROW_NUMBER() OVER (
                   PARTITION BY `category`
                   ORDER BY `publishedAt` IS NULL, `publishedAt` DESC, `createdAt` DESC
               ) AS `position`
        FROM `Article`
    ) AS `ranked` ON `ranked`.`id` = `a`.`id`
SET `a`.`sortOrder` = `ranked`.`position`;

CREATE INDEX `Article_category_sortOrder_idx` ON `Article`(`category`, `sortOrder`);
