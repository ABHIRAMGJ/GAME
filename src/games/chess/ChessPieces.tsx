import React from 'react';

// World-standard tournament chess pieces (Cburnett / Neo vector set)
// Rendered as high-fidelity inline SVGs with smooth vector curves, shading, and outlines

export interface PieceSvgProps {
  className?: string;
}

export const WhitePawn: React.FC<PieceSvgProps> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 45 45" className={className}>
    <path
      d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 l 23,0 c 0,-7.92 -4.41,-12.41 -7.41,-13.47 C 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
      fill="#ffffff"
      stroke="#18181b"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const BlackPawn: React.FC<PieceSvgProps> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 45 45" className={className}>
    <path
      d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 l 23,0 c 0,-7.92 -4.41,-12.41 -7.41,-13.47 C 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
      fill="#262421"
      stroke="#18181b"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const WhiteKnight: React.FC<PieceSvgProps> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 45 45" className={className}>
    <g fill="none" fillRule="evenodd" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"
        fill="#ffffff"
      />
      <path
        d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,7.4 17.05,5.6 19,4.5 C 20.95,3.4 23.3,4.5 24,5.5 C 24.7,6.5 24.5,8 22,10 z"
        fill="#ffffff"
      />
      <circle cx="15.5" cy="11.5" r="1.5" fill="#18181b" />
      <path d="M 9.5,25.5 C 10.5,25.5 11,26.5 11,27.5" />
    </g>
  </svg>
);

export const BlackKnight: React.FC<PieceSvgProps> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 45 45" className={className}>
    <g fill="none" fillRule="evenodd" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"
        fill="#262421"
      />
      <path
        d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,7.4 17.05,5.6 19,4.5 C 20.95,3.4 23.3,4.5 24,5.5 C 24.7,6.5 24.5,8 22,10 z"
        fill="#262421"
      />
      <circle cx="15.5" cy="11.5" r="1.5" fill="#ffffff" />
      <path d="M 9.5,25.5 C 10.5,25.5 11,26.5 11,27.5" stroke="#ffffff" />
    </g>
  </svg>
);

export const WhiteBishop: React.FC<PieceSvgProps> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 45 45" className={className}>
    <g fill="none" fillRule="evenodd" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <g fill="#ffffff" stroke="#18181b">
        <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.54 9,36 9,36 z" />
        <path d="M 12,36 C 12,32 15,31 16,29 C 17,27 18.5,21.5 18,17 C 17.5,12.5 18,10 22.5,9 C 27,10 27.5,12.5 27,17 C 26.5,21.5 28,27 29,29 C 30,31 33,32 33,36 z" />
        <circle cx="22.5" cy="7.5" r="2.5" />
      </g>
      <path d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,10 L 22.5,14 M 20,12 L 25,12" />
    </g>
  </svg>
);

export const BlackBishop: React.FC<PieceSvgProps> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 45 45" className={className}>
    <g fill="none" fillRule="evenodd" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <g fill="#262421" stroke="#18181b">
        <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.54 9,36 9,36 z" />
        <path d="M 12,36 C 12,32 15,31 16,29 C 17,27 18.5,21.5 18,17 C 17.5,12.5 18,10 22.5,9 C 27,10 27.5,12.5 27,17 C 26.5,21.5 28,27 29,29 C 30,31 33,32 33,36 z" />
        <circle cx="22.5" cy="7.5" r="2.5" />
      </g>
      <path d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,10 L 22.5,14 M 20,12 L 25,12" stroke="#ffffff" />
    </g>
  </svg>
);

export const WhiteRook: React.FC<PieceSvgProps> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 45 45" className={className}>
    <g fill="none" fillRule="evenodd" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M 9,39 L 36,39 L 36,36 L 9,36 z"
        fill="#ffffff"
      />
      <path
        d="M 12,36 L 12,32 L 33,32 L 33,36 z"
        fill="#ffffff"
      />
      <path
        d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 z"
        fill="#ffffff"
      />
      <path
        d="M 12,14 L 14,32 L 31,32 L 33,14 z"
        fill="#ffffff"
      />
      <path d="M 14,29.5 L 31,29.5 M 14,16.5 L 31,16.5" />
    </g>
  </svg>
);

export const BlackRook: React.FC<PieceSvgProps> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 45 45" className={className}>
    <g fill="none" fillRule="evenodd" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M 9,39 L 36,39 L 36,36 L 9,36 z"
        fill="#262421"
      />
      <path
        d="M 12,36 L 12,32 L 33,32 L 33,36 z"
        fill="#262421"
      />
      <path
        d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 z"
        fill="#262421"
      />
      <path
        d="M 12,14 L 14,32 L 31,32 L 33,14 z"
        fill="#262421"
      />
      <path d="M 14,29.5 L 31,29.5 M 14,16.5 L 31,16.5" stroke="#ffffff" />
    </g>
  </svg>
);

export const WhiteQueen: React.FC<PieceSvgProps> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 45 45" className={className}>
    <g fill="none" fillRule="evenodd" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 22.5,10 L 14,25 L 6.5,13.5 z"
        fill="#ffffff"
      />
      <path
        d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 10.5,36 10.5,36 C 9,37.5 11,38.5 11,38.5 L 34,38.5 C 34,38.5 36,37.5 34.5,36 C 34.5,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 z"
        fill="#ffffff"
      />
      <path d="M 11.5,30 C 15,29 30,29 33.5,30" />
      <path d="M 12,33.5 C 18,32.5 27,32.5 33,33.5" />
      <circle cx="6" cy="12" r="2" fill="#ffffff" />
      <circle cx="14" cy="9" r="2" fill="#ffffff" />
      <circle cx="22.5" cy="8" r="2" fill="#ffffff" />
      <circle cx="31" cy="9" r="2" fill="#ffffff" />
      <circle cx="39" cy="12" r="2" fill="#ffffff" />
    </g>
  </svg>
);

export const BlackQueen: React.FC<PieceSvgProps> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 45 45" className={className}>
    <g fill="none" fillRule="evenodd" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 22.5,10 L 14,25 L 6.5,13.5 z"
        fill="#262421"
      />
      <path
        d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 10.5,36 10.5,36 C 9,37.5 11,38.5 11,38.5 L 34,38.5 C 34,38.5 36,37.5 34.5,36 C 34.5,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 z"
        fill="#262421"
      />
      <path d="M 11.5,30 C 15,29 30,29 33.5,30" stroke="#ffffff" />
      <path d="M 12,33.5 C 18,32.5 27,32.5 33,33.5" stroke="#ffffff" />
      <circle cx="6" cy="12" r="2" fill="#262421" />
      <circle cx="14" cy="9" r="2" fill="#262421" />
      <circle cx="22.5" cy="8" r="2" fill="#262421" />
      <circle cx="31" cy="9" r="2" fill="#262421" />
      <circle cx="39" cy="12" r="2" fill="#262421" />
    </g>
  </svg>
);

export const WhiteKing: React.FC<PieceSvgProps> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 45 45" className={className}>
    <g fill="none" fillRule="evenodd" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M 22.5,11.63 L 22.5,6 M 20,8 L 25,8 M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 24,11.5 21,11.5 20,14.5 C 18.5,17.5 22.5,25 22.5,25 z"
        fill="#ffffff"
      />
      <path
        d="M 12.5,37 C 14.5,40.5 30.5,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 19,16 9.5,13 6.5,19.5 C 3.5,25.5 12.5,30 12.5,30 z"
        fill="#ffffff"
      />
      <path d="M 11.5,30 C 17,29 28,29 33.5,30 M 11.5,33.5 C 17,32.5 28,32.5 33.5,33.5 M 11.5,37 C 17,36 28,36 33.5,37" />
    </g>
  </svg>
);

export const BlackKing: React.FC<PieceSvgProps> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 45 45" className={className}>
    <g fill="none" fillRule="evenodd" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M 22.5,11.63 L 22.5,6 M 20,8 L 25,8 M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 24,11.5 21,11.5 20,14.5 C 18.5,17.5 22.5,25 22.5,25 z"
        fill="#262421"
      />
      <path
        d="M 12.5,37 C 14.5,40.5 30.5,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 19,16 9.5,13 6.5,19.5 C 3.5,25.5 12.5,30 12.5,30 z"
        fill="#262421"
      />
      <path d="M 11.5,30 C 17,29 28,29 33.5,30 M 11.5,33.5 C 17,32.5 28,32.5 33.5,33.5 M 11.5,37 C 17,36 28,36 33.5,37" stroke="#ffffff" />
    </g>
  </svg>
);

export const PIECE_COMPONENTS: Record<string, React.FC<PieceSvgProps>> = {
  wP: WhitePawn,
  wN: WhiteKnight,
  wB: WhiteBishop,
  wR: WhiteRook,
  wQ: WhiteQueen,
  wK: WhiteKing,
  bP: BlackPawn,
  bN: BlackKnight,
  bB: BlackBishop,
  bR: BlackRook,
  bQ: BlackQueen,
  bK: BlackKing,
};
