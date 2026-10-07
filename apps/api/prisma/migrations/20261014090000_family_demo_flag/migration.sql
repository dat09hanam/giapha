-- Gia phả mẫu: the one family the public home page shows to visitors before they sign in.

-- AlterTable
ALTER TABLE `Family` ADD COLUMN `isDemo` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `Family_isDemo_idx` ON `Family`(`isDemo`);
