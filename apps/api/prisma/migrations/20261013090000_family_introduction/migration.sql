-- Giới thiệu: the clan head's formatted introduction, stored as a structured document the API
-- validates. `description` stays as its plain-text form for the printed book and page metadata.

-- AlterTable
ALTER TABLE `Family` ADD COLUMN `introduction` JSON NULL;
