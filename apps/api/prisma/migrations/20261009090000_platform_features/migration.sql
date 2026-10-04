-- Chức năng move from each family to the whole platform: the platform admin switches a section
-- on or off for every family at once. The per-family switches go; a feature without a row is on.

-- AlterTable
ALTER TABLE `Family`
    DROP COLUMN `featureFeed`,
    DROP COLUMN `featureFund`,
    DROP COLUMN `featureLibrary`,
    DROP COLUMN `featureEditSuggestions`,
    DROP COLUMN `featurePrintBook`;

-- CreateTable
CREATE TABLE `PlatformFeature` (
    `key` VARCHAR(50) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
