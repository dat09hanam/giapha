-- Công đức: merit donations collected for a family occasion. Each donation is either cash
-- (amount) or goods (itemName, with an optional quantity and estimated value); the CHECK below
-- keeps the two shapes apart. Tenant-scoped through a composite (familyId, id) foreign key and
-- removed with its event or family.

-- CreateTable
CREATE TABLE `MeritEvent` (
    `id` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(1000) NULL,
    `heldOn` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MeritEvent_familyId_createdAt_idx`(`familyId`, `createdAt`),
    UNIQUE INDEX `MeritEvent_familyId_id_key`(`familyId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MeritDonation` (
    `id` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `eventId` CHAR(36) NOT NULL,
    `donorName` VARCHAR(100) NOT NULL,
    `kind` ENUM('CASH', 'ITEM') NOT NULL,
    `amount` BIGINT UNSIGNED NULL,
    `itemName` VARCHAR(191) NULL,
    `itemQuantity` VARCHAR(100) NULL,
    `estimatedValue` BIGINT UNSIGNED NULL,
    `note` VARCHAR(500) NULL,
    `donatedOn` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MeritDonation_familyId_eventId_donatedOn_idx`(`familyId`, `eventId`, `donatedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MeritEvent` ADD CONSTRAINT `MeritEvent_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MeritDonation` ADD CONSTRAINT `MeritDonation_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `Family`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MeritDonation` ADD CONSTRAINT `MeritDonation_event_fkey` FOREIGN KEY (`familyId`, `eventId`) REFERENCES `MeritEvent`(`familyId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- A cash donation carries only an amount; a goods donation names its item and has no amount.
ALTER TABLE `MeritDonation`
  ADD CONSTRAINT `MeritDonation_kind_check`
  CHECK (
    (
      `kind` = 'CASH'
      AND `amount` IS NOT NULL
      AND `amount` > 0
      AND `itemName` IS NULL
      AND `itemQuantity` IS NULL
      AND `estimatedValue` IS NULL
    )
    OR (`kind` = 'ITEM' AND `amount` IS NULL AND `itemName` IS NOT NULL)
  );
