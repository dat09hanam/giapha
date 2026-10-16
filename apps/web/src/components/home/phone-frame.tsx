import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';

import { cn } from '@/lib/utils';

import styles from './showcase.module.css';

/**
 * How a picture fills its box: `cover` fills it and crops the overflow, `contain` shows the whole
 * picture inside the box, `width` spans the full width and lets the height follow the picture
 * (a frameless picture taller than its slot shrinks to the slot's height instead).
 */
export type ImageFit = 'cover' | 'contain' | 'width';

/**
 * Picture sized by its own aspect ratio, so the sides are never cut. Its box is set by the
 * caller's CSS: full width in the phone, fitted inside the slot when frameless.
 */
function NaturalImage({
  src,
  alt,
  sizes,
  preload,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  preload?: boolean;
  className: string;
}) {
  return (
    <Image
      className={className}
      src={src}
      alt={alt}
      width={0}
      height={0}
      sizes={sizes}
      preload={preload}
    />
  );
}

type PhoneFrameProps = {
  alt: string;
  src?: string;
  /** Shown on an illustrated screen when there is no screenshot yet. */
  icon?: LucideIcon;
  sizes?: string;
  preload?: boolean;
  /** Slow pan and zoom over the screenshot. */
  animated?: boolean;
  /** How the screenshot fills the screen (`cover` by default). */
  fit?: ImageFit;
  /** Overrides the screenshot's object-position (`top center` by default). */
  focus?: string;
  className?: string;
};

export function PhoneFrame({
  alt,
  src,
  icon: Icon,
  sizes = '260px',
  preload = false,
  animated = false,
  fit,
  focus,
  className,
}: PhoneFrameProps) {
  const fullWidth = src !== undefined && fit === 'width';
  const objectFit = fit === 'width' ? undefined : fit;
  return (
    <div className={cn(styles.phone, className)}>
      <div className={cn(styles.screen, animated && styles.kenBurns)}>
        {fullWidth ? (
          <NaturalImage
            className={styles.screenFullWidth}
            src={src}
            alt={alt}
            sizes={sizes}
            preload={preload}
          />
        ) : src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            preload={preload}
            style={{ objectFit, objectPosition: focus }}
          />
        ) : (
          <div className={styles.illustratedScreen} role="img" aria-label={alt}>
            {Icon ? (
              <span className={styles.screenMedal}>
                <Icon size={40} strokeWidth={1.6} aria-hidden="true" />
              </span>
            ) : null}
            <span className={styles.screenTitle}>{alt}</span>
            <span className={styles.screenLines} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </div>
        )}
      </div>
      <span className={styles.notch} aria-hidden="true" />
    </div>
  );
}

/** A picture on its own, with no phone or sheet around it. */
export function BareImage({
  src,
  alt,
  sizes = '300px',
  fit = 'contain',
  focus,
}: {
  src: string;
  alt: string;
  sizes?: string;
  fit?: ImageFit;
  focus?: string;
}) {
  if (fit === 'width') {
    return (
      <div className={cn(styles.bareImage, styles.bareImageFitted)}>
        {/* Rendered wider than any slot, so `max-width`/`max-height` decide the final size. */}
        <NaturalImage className={styles.bareImageNatural} src={src} alt={alt} sizes="640px" />
      </div>
    );
  }
  return (
    <div className={styles.bareImage}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        style={{ objectFit: fit, objectPosition: focus }}
      />
    </div>
  );
}

export function PrintSheet({
  src,
  alt,
  sizes = '300px',
}: {
  src: string;
  alt: string;
  sizes?: string;
}) {
  return (
    <div className={styles.printStage}>
      <div className={styles.printSheet}>
        <Image src={src} alt={alt} fill sizes={sizes} />
      </div>
      <span className={styles.printTag}>In khổ lớn · PDF</span>
    </div>
  );
}
