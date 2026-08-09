/*
 * An abstract phone mock-up used beside the hero copy.
 *
 * It shows the shape of what is being sold — a call button above the fold, a short
 * service list, a quote form — without imitating a screenshot of a real business.
 * Purely decorative: the hero text says everything this conveys, so it is hidden from
 * assistive technology and carries no alternative text.
 */
export function HeroVisual({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 420"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {/* phone body */}
      <rect x="60" y="8" width="200" height="404" rx="26" fill="#ffffff" stroke="#d7dee5" />
      <rect x="70" y="18" width="180" height="384" rx="18" fill="#f4f7f9" />

      {/* site header with a call button */}
      <rect x="70" y="18" width="180" height="46" rx="18" fill="#0b4a6f" />
      <rect x="70" y="46" width="180" height="18" fill="#0b4a6f" />
      <rect x="84" y="32" width="54" height="8" rx="4" fill="#ffffff" opacity="0.9" />
      <rect x="84" y="44" width="34" height="6" rx="3" fill="#ffffff" opacity="0.55" />
      <rect x="168" y="32" width="68" height="20" rx="10" fill="#c2410c" />
      <rect x="180" y="39" width="44" height="6" rx="3" fill="#ffffff" />

      {/* headline block */}
      <rect x="84" y="82" width="152" height="10" rx="5" fill="#101a26" opacity="0.85" />
      <rect x="84" y="98" width="120" height="10" rx="5" fill="#101a26" opacity="0.85" />
      <rect x="84" y="120" width="140" height="6" rx="3" fill="#4a5a6a" opacity="0.5" />
      <rect x="84" y="132" width="110" height="6" rx="3" fill="#4a5a6a" opacity="0.5" />

      {/* primary action */}
      <rect x="84" y="152" width="152" height="34" rx="10" fill="#c2410c" />
      <rect x="118" y="165" width="84" height="8" rx="4" fill="#ffffff" />

      {/* service cards */}
      {[0, 1, 2].map((index) => (
        <g key={index}>
          <rect
            x="84"
            y={204 + index * 46}
            width="152"
            height="38"
            rx="8"
            fill="#ffffff"
            stroke="#d7dee5"
          />
          <circle cx="102" cy={223 + index * 46} r="8" fill="#e8f1f7" />
          <rect
            x="118"
            y={216 + index * 46}
            width={index === 1 ? 74 : 90}
            height="6"
            rx="3"
            fill="#101a26"
            opacity="0.75"
          />
          <rect
            x="118"
            y={228 + index * 46}
            width="58"
            height="5"
            rx="2.5"
            fill="#4a5a6a"
            opacity="0.45"
          />
        </g>
      ))}

      {/* quote form */}
      <rect x="84" y="348" width="152" height="40" rx="8" fill="#e8f1f7" stroke="#c3d7e6" />
      <rect x="94" y="358" width="76" height="6" rx="3" fill="#0b4a6f" opacity="0.8" />
      <rect x="94" y="370" width="132" height="10" rx="5" fill="#ffffff" stroke="#c3d7e6" />
    </svg>
  );
}
