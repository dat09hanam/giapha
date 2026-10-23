-- A clan head's request to change their family's plan is a service registration tied to the family.
ALTER TABLE `ServiceRegistration` ADD COLUMN `familyId` CHAR(36) NULL;

CREATE INDEX `ServiceRegistration_familyId_status_idx` ON `ServiceRegistration`(`familyId`, `status`);

ALTER TABLE `ServiceRegistration`
    ADD CONSTRAINT `ServiceRegistration_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
