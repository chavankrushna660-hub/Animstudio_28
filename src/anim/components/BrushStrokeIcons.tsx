import React from 'react';

interface BrushStrokeIconProps {
  type: string;
  className?: string;
  isActive?: boolean;
}

export const BrushStrokeIcon: React.FC<BrushStrokeIconProps> = ({ type, className = "w-full h-8", isActive = false }) => {
  // Always use solid black for high contrast, thick, bold visibility on white/light surfaces
  const strokeColor = "#000000";
  const accentColor = "#475569";

  switch (type) {
    case 'solid':
      // Solid dynamic tapered stroke - bold and thick
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 4 18 C 20 7, 45 3, 72 13 C 86 18, 94 14, 97 11 C 93 23, 68 29, 40 25 C 18 21, 8 23, 4 18 Z"
            fill={strokeColor}
          />
        </svg>
      );

    case 'cold':
      // Frost / Crystalline sharp fractured stroke - thick and bold
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 4 16 L 18 9 L 26 22 L 38 6 L 50 24 L 62 7 L 74 22 L 86 10 L 96 16 L 86 22 L 72 15 L 58 26 L 46 13 L 34 24 L 18 16 Z"
            fill={strokeColor}
          />
          {/* Large Ice frost crystals */}
          <polygon points="30,4 36,9 30,14 24,9" fill={accentColor} />
          <polygon points="68,3 74,8 68,13 62,8" fill={accentColor} />
          <polygon points="50,21 55,26 50,31 45,26" fill={accentColor} />
        </svg>
      );

    case 'dry':
      // Dry bristle brush stroke with thick parallel filaments and skips
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 4 8 Q 38 4 68 12 T 96 9" stroke={strokeColor} strokeWidth="4.5" strokeDasharray="22 4 14 3 24 2" strokeLinecap="round" />
          <path d="M 5 14 Q 36 9 66 17 T 94 14" stroke={strokeColor} strokeWidth="4" strokeDasharray="16 5 18 4" strokeLinecap="round" />
          <path d="M 6 20 Q 40 15 70 22 T 95 19" stroke={strokeColor} strokeWidth="4" strokeDasharray="12 3 24 5 14 2" strokeLinecap="round" />
          <path d="M 8 25 Q 44 20 74 25 T 92 24" stroke={strokeColor} strokeWidth="3.2" strokeDasharray="16 6 18 5" strokeLinecap="round" />
        </svg>
      );

    case 'smooth':
      // Streamline smooth vector curve - extra thick
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 5 16 C 30 4, 65 28, 95 14"
            stroke={strokeColor}
            strokeWidth="9"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'water':
      // Watercolor wash with fluid edges - prominent gradient & outline
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`waterGrad-${isActive}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.45" />
              <stop offset="50%" stopColor={strokeColor} stopOpacity="0.9" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.55" />
            </linearGradient>
          </defs>
          <path
            d="M 4 16 C 18 7, 34 5, 50 10 C 66 15, 80 8, 96 13 C 90 25, 72 28, 50 23 C 30 20, 16 27, 4 16 Z"
            fill={`url(#waterGrad-${isActive})`}
            stroke={strokeColor}
            strokeWidth="2.5"
          />
        </svg>
      );

    case 'calligraphy':
      // Chisel nib calligraphy ribbon - wide and bold
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 4 25 L 18 7 C 42 3, 62 10, 76 21 C 88 28, 93 21, 97 10 L 89 27 C 70 19, 48 15, 26 21 L 4 25 Z"
            fill={strokeColor}
          />
        </svg>
      );

    case 'pencil':
      // Graphite pencil with textured core - thick and clear
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 4 16 C 30 8, 60 24, 96 14" stroke={strokeColor} strokeWidth="5.5" strokeLinecap="round" strokeDasharray="16 2 22 2 14 2" />
          <circle cx="14" cy="11" r="2" fill={strokeColor} />
          <circle cx="28" cy="19" r="2" fill={strokeColor} />
          <circle cx="45" cy="11" r="2.2" fill={strokeColor} />
          <circle cx="62" cy="21" r="2" fill={strokeColor} />
          <circle cx="78" cy="12" r="2.2" fill={strokeColor} />
          <circle cx="88" cy="18" r="2" fill={strokeColor} />
        </svg>
      );

    case 'marker':
      // Broad translucent chisel marker - wide and visible
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 4 24 L 14 8 L 88 8 L 96 24 L 12 24 Z"
            fill={strokeColor}
            opacity="0.75"
          />
          <path
            d="M 8 21 L 16 10 L 86 10 L 93 21 Z"
            fill={strokeColor}
          />
        </svg>
      );

    case 'airbrush':
      // Soft diffused airbrush mist - rich and broad
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id={`airblur-${isActive}`} x="-20%" y="-40%" width="140%" height="180%">
              <feGaussianBlur stdDeviation="4.5" />
            </filter>
          </defs>
          <path d="M 8 16 C 35 7, 65 25, 92 16" stroke={strokeColor} strokeWidth="20" strokeLinecap="round" filter={`url(#airblur-${isActive})`} opacity="0.65" />
          <path d="M 10 16 C 35 9, 65 23, 90 16" stroke={strokeColor} strokeWidth="9" strokeLinecap="round" opacity="0.95" />
        </svg>
      );

    case 'glow':
      // Neon glow aura line with bright core - thick and prominent
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id={`glowblur-${isActive}`} x="-30%" y="-50%" width="160%" height="200%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>
          <path d="M 5 16 C 30 5, 65 27, 95 16" stroke={strokeColor} strokeWidth="20" strokeLinecap="round" filter={`url(#glowblur-${isActive})`} opacity="0.55" />
          <path d="M 5 16 C 30 5, 65 27, 95 16" stroke={strokeColor} strokeWidth="10" strokeLinecap="round" opacity="0.88" />
          <path d="M 5 16 C 30 5, 65 27, 95 16" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );

    case 'ink':
      // Japanese Sumi ink stroke with bleed & bold droplets
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 4 18 C 14 9, 26 6, 40 10 C 48 11, 54 6, 66 12 C 78 18, 86 10, 96 15 C 90 24, 80 27, 66 22 C 50 18, 34 25, 18 23 C 10 26, 4 24, 4 18 Z"
            fill={strokeColor}
          />
          <circle cx="7" cy="18" r="5.5" fill={strokeColor} />
          <circle cx="94" cy="15" r="4.5" fill={strokeColor} />
          <circle cx="28" cy="7" r="2.5" fill={strokeColor} />
          <circle cx="76" cy="26" r="3" fill={strokeColor} />
        </svg>
      );

    case 'charcoal':
      // Heavy textured compressed charcoal - thick rough streak
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 5 12 Q 28 5 50 15 T 95 12"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="square"
            strokeDasharray="14 3 10 4 18 2"
          />
          <path
            d="M 6 19 Q 30 13 54 21 T 94 19"
            stroke={strokeColor}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray="8 3 14 4"
          />
        </svg>
      );

    case 'oil':
      // Thick 3D oil impasto stroke - bold with specular crest
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 4 17 C 28 5, 62 27, 96 15"
            stroke={strokeColor}
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Specular crest */}
          <path
            d="M 12 13 C 32 6, 64 21, 88 12"
            stroke={accentColor}
            strokeWidth="3.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'watercolor':
      // Multi-tone translucent watercolor wash - large and fluid
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 5 16 C 24 6, 46 5, 62 11 C 78 16, 88 9, 95 13 C 89 26, 70 28, 50 22 C 30 18, 16 25, 5 16 Z"
            fill={strokeColor}
            opacity="0.45"
          />
          <path
            d="M 12 16 C 30 9, 48 9, 64 14 C 76 17, 84 12, 90 15 C 82 23, 68 25, 52 20 C 36 16, 22 21, 12 16 Z"
            fill={strokeColor}
            opacity="0.88"
          />
        </svg>
      );

    case 'crayon':
      // Wax crayon stippled stroke - heavy and bold
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 4 16 C 30 7, 60 25, 96 15"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="3 4"
          />
          <path
            d="M 6 16 C 32 8, 62 24, 94 15"
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="2 3"
          />
        </svg>
      );

    case 'spray':
      // Spray paint scattered splatter - bold and clearly visible
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="16" r="3" fill={strokeColor} />
          <circle cx="15" cy="9" r="3.5" fill={strokeColor} />
          <circle cx="22" cy="20" r="2.6" fill={strokeColor} />
          <circle cx="29" cy="12" r="3.8" fill={strokeColor} />
          <circle cx="36" cy="19" r="2.8" fill={strokeColor} />
          <circle cx="44" cy="10" r="4.2" fill={strokeColor} />
          <circle cx="51" cy="21" r="2.8" fill={strokeColor} />
          <circle cx="59" cy="13" r="4.5" fill={strokeColor} />
          <circle cx="67" cy="20" r="3" fill={strokeColor} />
          <circle cx="75" cy="11" r="4" fill={strokeColor} />
          <circle cx="83" cy="19" r="2.8" fill={strokeColor} />
          <circle cx="90" cy="11" r="3.5" fill={strokeColor} />
          <circle cx="95" cy="17" r="2.5" fill={strokeColor} />
          <circle cx="26" cy="24" r="2.2" fill={strokeColor} />
          <circle cx="52" cy="6" r="2.5" fill={strokeColor} />
          <circle cx="72" cy="25" r="2.4" fill={strokeColor} />
          <circle cx="40" cy="25" r="2" fill={strokeColor} />
          <circle cx="63" cy="6" r="2.2" fill={strokeColor} />
        </svg>
      );

    case 'dotted':
      // Precision dotted line - large dots
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 6 16 L 94 16"
            stroke={strokeColor}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray="0.1 14"
          />
        </svg>
      );

    case 'dashed':
      // Precision dashed line - thick and punchy
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 4 16 L 96 16"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="14 9"
          />
        </svg>
      );

    case 'ribbon':
      // 3D twisted ribbon band - thick and dimensional
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 4 20 C 25 5, 45 7, 56 18 C 66 26, 80 24, 96 10 L 96 19 C 80 31, 62 29, 50 19 C 38 11, 18 15, 4 28 Z"
            fill={strokeColor}
          />
          <path
            d="M 50 19 C 62 29, 80 31, 96 19 L 96 10 C 80 24, 66 26, 56 18 Z"
            fill={accentColor}
            opacity="0.88"
          />
        </svg>
      );

    case 'organic':
      // Organic botanical leaf stroke - bold stem and leaves
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 4 16 C 30 9, 60 23, 96 14" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" />
          <path d="M 22 13 Q 28 4 37 10 Q 28 16 22 13 Z" fill={strokeColor} />
          <path d="M 44 17 Q 53 26 62 21 Q 53 15 44 17 Z" fill={strokeColor} />
          <path d="M 68 15 Q 77 6 86 13 Q 77 19 68 15 Z" fill={strokeColor} />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 4 16 L 96 16" stroke={strokeColor} strokeWidth="7" strokeLinecap="round" />
        </svg>
      );
  }
};
