-- Công đức: a goods donation may carry a note too, as a cash one does.

-- DropCheck (re-added below without the rule that goods have no note)
ALTER TABLE `MeritDonation` DROP CHECK `MeritDonation_kind_check`;

-- A cash donation carries an amount; a goods donation carries its content. Either may have a note.
ALTER TABLE `MeritDonation`
  ADD CONSTRAINT `MeritDonation_kind_check`
  CHECK (
    (`kind` = 'CASH' AND `amount` IS NOT NULL AND `amount` > 0 AND `itemContent` IS NULL)
    OR (`kind` = 'ITEM' AND `amount` IS NULL AND `itemContent` IS NOT NULL)
  );
