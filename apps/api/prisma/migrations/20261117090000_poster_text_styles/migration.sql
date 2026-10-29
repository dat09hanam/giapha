-- Text effects (fill mode, gradient, outline, shadow) for the three poster text areas.
-- NULL keeps the built-in look, so existing backgrounds render exactly as before.
ALTER TABLE `PosterDecoration`
    ADD COLUMN `nameTextStyle` JSON NULL,
    ADD COLUMN `leftTextStyle` JSON NULL,
    ADD COLUMN `rightTextStyle` JSON NULL;
