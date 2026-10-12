import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';

import { cn } from '@/lib/utils';

import styles from './showcase.module.css';

type PhoneFrameProps = {
  alt: string;
  src?: string;
  /** Shown on an illustrated screen when there is no screenshot yet. */
  icon?: LucideIcon;
  sizes?: string;
  preload?: boolean;
  /** Slow pan and zoom over the screenshot. */
  animated?: boolean;
  className?: string;
};

export function PhoneFrame({
  alt,
  src,
  icon: Icon,
  sizes = '260px',
  preload = false,
  animated = false,
  className,
}: PhoneFrameProps) {
  return (
    <div className={cn(styles.phone, className)}>
      <div className={cn(styles.screen, animated && styles.kenBurns)}>
        {src ? (
          <Image src={src} alt={alt} fill sizes={sizes} preload={preload} />
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
