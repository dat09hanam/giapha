-- Chức năng: the clan head switches each family section on or off. Every family keeps all of
-- them on until the clan head says otherwise.

-- AlterTable
ALTER TABLE `Family`
    ADD COLUMN `featureFeed` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `featureFund` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `featureLibrary` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `featureEditSuggestions` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `featurePrintBook` BOOLEAN NOT NULL DEFAULT true;
