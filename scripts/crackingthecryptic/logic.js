function getCell(row, col) {
    // Construct the selector based on the provided row and col
    const selector = `.cell[row="${row}"][col="${col}"]`;

    // Select the cell
    const targetCell = document.querySelector(selector);

    // Check if the element exists
    if (targetCell) {
        return targetCell;
    } else {
        console.log(`Cell at row=${row}, col=${col} not found.`);
        return null; // or handle accordingly based on your needs
    }
}

// Example usage:
const row = 8;
const col = 6;

const cell = getCell(row, col);

if (cell) {
    console.log(`Cell at row=${row}, col=${col} found:`, cell);
    cell.click();
}
