export const ROWS = 6;
export const COLS = 7;

const checkWinner = (board: number[][]): number => {
  const rows = board.length;
  const cols = board[0].length;

  // Check horizontal
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= cols - 4; col++) {
      const value = board[row][col];
      if (
        value !== 0 &&
        value === board[row][col + 1] &&
        value === board[row][col + 2] &&
        value === board[row][col + 3]
      ) {
        return value;
      }
    }
  }

  // Check vertical
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row <= rows - 4; row++) {
      const value = board[row][col];
      if (
        value !== 0 &&
        value === board[row + 1][col] &&
        value === board[row + 2][col] &&
        value === board[row + 3][col]
      ) {
        return value;
      }
    }
  }

  // Check diagonals (positive slope)
  for (let row = 0; row <= rows - 4; row++) {
    for (let col = 0; col <= cols - 4; col++) {
      const value = board[row][col];
      if (
        value !== 0 &&
        value === board[row + 1][col + 1] &&
        value === board[row + 2][col + 2] &&
        value === board[row + 3][col + 3]
      ) {
        return value;
      }
    }
  }

  // Check diagonals (negative slope)
  for (let row = 3; row < rows; row++) {
    for (let col = 0; col <= cols - 4; col++) {
      const value = board[row][col];
      if (
        value !== 0 &&
        value === board[row - 1][col + 1] &&
        value === board[row - 2][col + 2] &&
        value === board[row - 3][col + 3]
      ) {
        return value;
      }
    }
  }

  return 0;
};

// Return 0 if the game is over
const checkGameOn = (board: number[][]): boolean => {
  return !Boolean(
    board[0].reduce((total, n) => {
      return total + Math.abs(n);
    }, 0)
  );
};

const playMove = (
  board: number[][],
  col: number,
  currentPlayer: number
): number[][] => {
  const newBoard = [...board];
  for (let row = ROWS - 1; row >= 0; row--) {
    if (newBoard[row][col] === 0) {
      newBoard[row][col] = currentPlayer;
      break;
    }
  }
  return newBoard;
};

export const handlePlayMove = (
  board: number[][],
  col: number,
  currentPlayer: number
) => {
  const newBoard = playMove(board, col, currentPlayer);
  const winner = checkWinner(newBoard);
  return { newBoard, winner };
};
