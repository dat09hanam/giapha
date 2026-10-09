-- The member editor's profile, hometown and worship sections.
ALTER TABLE `Person`
  ADD COLUMN `maritalStatus` ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED') NULL,
  ADD COLUMN `education` VARCHAR(191) NULL,
  ADD COLUMN `occupation` VARCHAR(191) NULL,
  ADD COLUMN `hometown` VARCHAR(255) NULL,
  ADD COLUMN `currentAddress` VARCHAR(255) NULL,
  ADD COLUMN `mapUrl` VARCHAR(500) NULL,
  ADD COLUMN `ageAtDeath` TINYINT UNSIGNED NULL,
  ADD COLUMN `worshipPlace` VARCHAR(255) NULL,
  ADD COLUMN `worshipKeeperId` CHAR(36) NULL,
  ADD COLUMN `deathAnniversaryText` VARCHAR(191) NULL;

CREATE INDEX `Person_familyId_worshipKeeperId_idx` ON `Person`(`familyId`, `worshipKeeperId`);

-- The keeper is in the same Family, like a parent: the composite key keeps it there.
ALTER TABLE `Person`
  ADD CONSTRAINT `Person_worship_keeper_fkey`
    FOREIGN KEY (`familyId`, `worshipKeeperId`) REFERENCES `Person`(`familyId`, `id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
