import { FENChar } from '../chess-logic/models';

export type BoardThemeId = 'green' | 'blue';
export type PieceSetId = 'cburnett' | 'alpha';

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  subtitle: string;
  lightSquare: string;
  darkSquare: string;
  lightCoord: string;
  darkCoord: string;
  lastMoveLight: string;
  lastMoveDark: string;
  selectedSquare: string;
  previewLight: string;
  previewDark: string;
}

export interface PieceSet {
  id: PieceSetId;
  name: string;
  subtitle: string;
  folder: string;
  previewPieceWhite: string;
  previewPieceBlack: string;
}

export const BOARD_THEMES: Record<BoardThemeId, BoardTheme> = {
  green: {
    id: 'green',
    name: 'Green & Cream',
    subtitle: 'Classic Tournament Style (Image 1)',
    lightSquare: '#ebecd0',
    darkSquare: '#739552',
    lightCoord: '#ebecd0',
    darkCoord: '#739552',
    lastMoveLight: '#b9ca43',
    lastMoveDark: '#a3b832',
    selectedSquare: '#f7ec74',
    previewLight: '#ebecd0',
    previewDark: '#739552',
  },
  blue: {
    id: 'blue',
    name: 'Ocean Blue & Ice',
    subtitle: 'Modern Slate Blue Style (Image 2)',
    lightSquare: '#ecf1f7',
    darkSquare: '#6c85b5',
    lightCoord: '#ecf1f7',
    darkCoord: '#6c85b5',
    lastMoveLight: '#a9c3ea',
    lastMoveDark: '#8aa3cc',
    selectedSquare: '#f7ec74',
    previewLight: '#ecf1f7',
    previewDark: '#6c85b5',
  },
};

export const PIECE_SETS: Record<PieceSetId, PieceSet> = {
  cburnett: {
    id: 'cburnett',
    name: 'Neo / Vector',
    subtitle: 'Modern Clean Style (Image 1)',
    folder: 'cburnett',
    previewPieceWhite: '/assets/pieces/cburnett/wN.svg',
    previewPieceBlack: '/assets/pieces/cburnett/bN.svg',
  },
  alpha: {
    id: 'alpha',
    name: 'Alpha / Classic',
    subtitle: 'High-Contrast Tournament Style (Image 2)',
    folder: 'alpha',
    previewPieceWhite: '/assets/pieces/alpha/wN.svg',
    previewPieceBlack: '/assets/pieces/alpha/bN.svg',
  },
};

/**
 * Returns the SVG asset path for a piece based on the selected piece set
 */
export function getPieceSvgPath(piece: FENChar | string, pieceSetId: PieceSetId = 'cburnett'): string {
  const isWhite = piece === piece.toUpperCase();
  const prefix = isWhite ? 'w' : 'b';
  const type = piece.toUpperCase();
  return `/assets/pieces/${pieceSetId}/${prefix}${type}.svg`;
}
