export function BlossomBranch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 90" className={className} aria-hidden="true">
      <path
        d="M0 8 Q40 14 64 34 T120 70 M46 22 Q58 8 76 6 M78 46 Q96 40 104 26"
        fill="none"
        stroke="#65431f"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <g fill="#e8c4c0" stroke="#a83a34" strokeWidth={1}>
        {[
          [62, 32],
          [76, 6],
          [104, 26],
          [118, 68],
          [90, 52],
          [34, 16],
        ].map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r={5.5} />
            <circle cx={cx} cy={cy} r={1.6} fill="#d4af37" stroke="none" />
          </g>
        ))}
      </g>
    </svg>
  );
}
