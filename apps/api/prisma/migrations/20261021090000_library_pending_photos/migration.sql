-- Members may send photos into an album; they wait as PENDING until the clan head approves them.
ALTER TABLE `Media`
  MODIFY `status` ENUM('ACTIVE', 'HIDDEN', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN `uploadedById` CHAR(36) NULL;

CREATE INDEX `Media_familyId_albumId_status_idx` ON `Media`(`familyId`, `albumId`, `status`);
CREATE INDEX `Media_uploadedById_idx` ON `Media`(`uploadedById`);

ALTER TABLE `Media`
  ADD CONSTRAINT `Media_uploadedById_fkey`
    FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
