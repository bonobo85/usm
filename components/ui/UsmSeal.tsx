interface SealProps {
  size?: number;
  className?: string;
}

/**
 * Sceau US Marshals stylisé en SVG.
 * Reproduit l'esprit du sceau "Department of Justice / United States Marshal"
 * avec anneau doré, étoile centrale et texte circulaire.
 */
export function UsmSeal({ size = 90, className = '' }: SealProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="sealRing" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#c89b4a" />
          <stop offset="60%" stopColor="#9c7327" />
          <stop offset="100%" stopColor="#6b4e15" />
        </radialGradient>
        <radialGradient id="sealCenter" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#1e3a6b" />
          <stop offset="100%" stopColor="#0d1d3d" />
        </radialGradient>
        <path id="topArc" d="M 30 100 A 70 70 0 0 1 170 100" fill="none" />
        <path id="bottomArc" d="M 32 100 A 68 68 0 0 0 168 100" fill="none" />
      </defs>

      {/* Anneau extérieur doré */}
      <circle cx="100" cy="100" r="98" fill="url(#sealRing)" />
      <circle cx="100" cy="100" r="80" fill="#0d1d3d" />
      <circle cx="100" cy="100" r="78" fill="none" stroke="#c89b4a" strokeWidth="1.5" />

      {/* Texte circulaire haut */}
      <text fontSize="13" fontWeight="bold" fill="#e8c87a" letterSpacing="2.5">
        <textPath href="#topArc" startOffset="50%" textAnchor="middle">
          DEPARTMENT OF JUSTICE
        </textPath>
      </text>
      {/* Texte circulaire bas */}
      <text fontSize="13" fontWeight="bold" fill="#e8c87a" letterSpacing="2.5">
        <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">
          UNITED STATES MARSHAL
        </textPath>
      </text>

      {/* Centre bleu */}
      <circle cx="100" cy="100" r="55" fill="url(#sealCenter)" />
      <circle cx="100" cy="100" r="55" fill="none" stroke="#c89b4a" strokeWidth="2" />

      {/* Aigle stylisé (forme simplifiée) */}
      <g fill="#d8dde8">
        {/* Corps */}
        <ellipse cx="100" cy="95" rx="10" ry="16" />
        {/* Tête */}
        <circle cx="100" cy="74" r="7" fill="#f0f2f6" />
        {/* Ailes déployées */}
        <path d="M 100 85 Q 70 78 55 92 Q 75 90 100 100 Z" />
        <path d="M 100 85 Q 130 78 145 92 Q 125 90 100 100 Z" />
        {/* Queue */}
        <path d="M 92 108 L 108 108 L 104 124 L 96 124 Z" />
      </g>

      {/* Étoile centrale dorée */}
      <path
        d="M 100 88 L 103 97 L 112 97 L 105 103 L 108 112 L 100 106 L 92 112 L 95 103 L 88 97 L 97 97 Z"
        fill="#e8c87a"
      />

      {/* Bannière "JUSTICE INTEGRITY SERVICE" */}
      <rect x="68" y="128" width="64" height="13" rx="2" fill="#7a1f1f" />
      <text x="100" y="137" fontSize="7" fontWeight="bold" fill="#f0e6d2" textAnchor="middle" letterSpacing="0.5">
        JUSTICE · INTEGRITY
      </text>
    </svg>
  );
}
