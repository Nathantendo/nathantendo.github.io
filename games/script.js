const player = document.querySelector('.player');
const scoreDisplay = document.getElementById('score');
const jumpSound = document.getElementById('jumpSound');
let score = 0;

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") player.style.left = `${parseInt(player.style.left) - 10}px`;
    if (e.key === "ArrowRight") player.style.left = `${parseInt(player.style.left) + 10}px`;
    if (e.key === "ArrowUp") {
        jumpSound.play();
        player.style.bottom = "60px";
        setTimeout(() => player.style.bottom = "20px", 400);
    }
});

// Score tracking when jumping
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
        score += 10;
        scoreDisplay.textContent = score;
    }
});

// Game over when hitting a barrel (simplified)
const barrel = document.querySelector('.barrel');
setInterval(() => {
    if (parseInt(barrel.style.left) < parseInt(player.style.left) + 20 &&
        parseInt(barrel.style.left) + 20 > parseInt(player.style.left) &&
        parseInt(barrel.style.top) < parseInt(player.style.bottom) + 20 &&
        parseInt(barrel.style.top) + 20 > parseInt(player.style.bottom)) {
        alert("Game Over!");
        score = 0;
        scoreDisplay.textContent = score;
    }
}, 500);
