-- Công đức: a goods donation is described by one free-text field (itemContent) instead of a name,
-- quantity and estimated value, and carries no separate note. Existing goods keep their name and
-- quantity folded into the new field; their estimated value and note are dropped.

-- DropCheck (re-added below for the new shape)
ALTER TABLE `MeritDonation` DROP CHECK `MeritDonation_kind_check`;

-- AlterTable
ALTER TABLE `MeritDonation` ADD COLUMN `itemContent` VARCHAR(500) NULL;
UPDATE `MeritDonation`
  SET `itemContent` = CONCAT_WS(', ', `itemName`, NULLIF(`itemQuantity`, '')), `note` = NULL
  WHERE `kind` = 'ITEM';
ALTER TABLE `MeritDonation`
  DROP COLUMN `itemName`,
  DROP COLUMN `itemQuantity`,
  DROP COLUMN `estimatedValue`;

-- A cash donation carries an amount and may carry a note; a goods donation has only its content.
ALTER TABLE `MeritDonation`
  ADD CONSTRAINT `MeritDonation_kind_check`
  CHECK (
    (`kind` = 'CASH' AND `amount` IS NOT NULL AND `amount` > 0 AND `itemContent` IS NULL)
    OR (
      `kind` = 'ITEM'
      AND `amount` IS NULL
      AND `itemContent` IS NOT NULL
      AND `note` IS NULL
    )
  );
