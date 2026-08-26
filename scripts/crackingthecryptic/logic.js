'use strict';
// Experiment: address a puzzle cell by row/column and click it.
//
// The @match pattern used to be missing its path, so this script never actually
// ran. Now that it does, the example call is behind a flag — clicking r8c6 in
// every puzzle you open is not something you want by default. Set AUTO_CLICK to
// a { row, col } object to bring it back, or use getCell() from the console.

const AUTO_CLICK = null; // e.g. { row: 8, col: 6 }

function getCell(row, col) {
  // Construct the selector based on the provided row and col
  const selector = `.cell[row="${row}"][col="${col}"]`;

  // Select the cell
  const targetCell = document.querySelector(selector);

  // Check if the element exists
  if (targetCell) {
    return targetCell;
  }
  console.log(`Cell at row=${row}, col=${col} not found.`);
  return null; // or handle accordingly based on your needs
}

if (AUTO_CLICK) {
  const cell = getCell(AUTO_CLICK.row, AUTO_CLICK.col);
  if (cell) {
    console.log(`Cell at row=${AUTO_CLICK.row}, col=${AUTO_CLICK.col} found:`, cell);
    cell.click();
  }
}

// Exposed for console use: _ctc.getCell(8, 6).click()
window._ctc = { getCell };
