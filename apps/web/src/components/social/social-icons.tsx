type IconProps = { size?: number };

export function FacebookIcon({ size = 18 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8.1v3h2.5V21h2.9Z" />
    </svg>
  );
}

export function YoutubeIcon({ size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
    </svg>
  );
}

export function TiktokIcon({ size = 18 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M16.6 3h-3.1v12.2a2.7 2.7 0 1 1-2.7-2.7c.3 0 .6 0 .8.1V9.4a5.9 5.9 0 1 0 5 5.8V9a7.4 7.4 0 0 0 4.4 1.4V7.3A4.4 4.4 0 0 1 16.6 3Z" />
    </svg>
  );
}

export function ZaloIcon({ size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.5C6.5 2.5 2 6.4 2 11.2c0 2.6 1.3 4.9 3.4 6.5-.2 1.2-.8 2.4-1.7 3.3 1.9 0 3.6-.6 4.9-1.6 1.1.4 2.2.5 3.4.5 5.5 0 10-3.9 10-8.7S17.5 2.5 12 2.5Z"
      />
      <text
        x="12"
        y="13.6"
        textAnchor="middle"
        fontSize="6.4"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
        fill="var(--zalo-ink, #fff)"
      >
        Zalo
      </text>
    </svg>
  );
}
