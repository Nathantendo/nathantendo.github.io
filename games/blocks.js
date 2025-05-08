const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const COLS = 10, ROWS = 20, BLOCK_SIZE = 30;
const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

class Block {
    constructor(shape) {
        this.shape = shape;
        this.x = 3;
        this.y = 0;
    }

    draw() {
        ctx.fillStyle = "blue";
        this.shape.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (cell) {
                    ctx.fillRect((this.x + colIndex) * BLOCK_SIZE, (this.y + rowIndex) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }
}

const block = new Block([
    [1, 1, 1, 1] // A simple horizontal shape
]);

function updateGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    block.draw();
    block.y++;
    requestAnimationFrame(updateGame);
}

updateGame();
