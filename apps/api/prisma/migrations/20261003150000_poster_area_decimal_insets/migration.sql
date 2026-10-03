-- Poster area edges are kept to a tenth of a percent so the ADMIN can nudge them finely.

-- AlterTable
ALTER TABLE `PosterDecoration` MODIFY `insetTop` DOUBLE NULL,
    MODIFY `insetRight` DOUBLE NULL,
    MODIFY `insetBottom` DOUBLE NULL,
    MODIFY `insetLeft` DOUBLE NULL,
    MODIFY `nameInsetTop` DOUBLE NULL,
    MODIFY `nameInsetRight` DOUBLE NULL,
    MODIFY `nameInsetBottom` DOUBLE NULL,
    MODIFY `nameInsetLeft` DOUBLE NULL,
    MODIFY `leftTextInsetTop` DOUBLE NULL,
    MODIFY `leftTextInsetRight` DOUBLE NULL,
    MODIFY `leftTextInsetBottom` DOUBLE NULL,
    MODIFY `leftTextInsetLeft` DOUBLE NULL,
    MODIFY `rightTextInsetTop` DOUBLE NULL,
    MODIFY `rightTextInsetRight` DOUBLE NULL,
    MODIFY `rightTextInsetBottom` DOUBLE NULL,
    MODIFY `rightTextInsetLeft` DOUBLE NULL;
