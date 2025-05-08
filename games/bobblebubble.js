let player = { x: 100, y: 500, speed: 5, velocityY: 0, jumping: false };

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") player.x += player.speed;
  if (event.key === "ArrowLeft") player.x -= player.speed;
  if (event.key === "ArrowUp" && !player.jumping) {
    player.velocityY = -10;
    player.jumping = true;
  }
});

function updatePlayer() {
  player.y += player.velocityY;
  player.velocityY += 0.5; // Gravity simulation

  if (player.y >= 500) { // Ground collision
    player.y = 500;
    player.jumping = false;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayer(player.x, player.y);
  requestAnimationFrame(updatePlayer);
}

updatePlayer();
let bubbles = [];

document.addEventListener("keydown", (event) => {
    if (event.key === " ") {  // Spacebar to shoot
        bubbles.push({ x: player.x + 20, y: player.y, speed: 5 });
    }
});

function updateBubbles() {
    for (let i = 0; i < bubbles.length; i++) {
        bubbles[i].y -= bubbles[i].speed;
    }

    // Remove bubbles that go off-screen
    bubbles = bubbles.filter(bubble => bubble.y > 0);
}

function drawBubbles() {
    ctx.fillStyle = "lightblue";
    for (let bubble of bubbles) {
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updatePlayer();
    updateBubbles();
    drawPlayer(player.x, player.y);
    drawBubbles();
    requestAnimationFrame(gameLoop);
}

gameLoop();
let enemies = [];

function spawnEnemy() {
    let enemy = {
        x: Math.random() * (canvas.width - 40),
        y: 100,
        speed: 2,
        direction: 1, // 1 = right, -1 = left
        captured: false
    };
    enemies.push(enemy);
}

// Spawn enemies at intervals
setInterval(spawnEnemy, 3000);

function updateEnemies() {
    for (let enemy of enemies) {
        if (!enemy.captured) {
            enemy.x += enemy.speed * enemy.direction;

            // Change direction at canvas edges
            if (enemy.x <= 0 || enemy.x >= canvas.width - 40) {
                enemy.direction *= -1;
            }
        }
    }
}

function drawEnemies() {
    ctx.fillStyle = "red";
    for (let enemy of enemies) {
        ctx.fillRect(enemy.x, enemy.y, 40, 40);
    }
}
function checkBubbleCollision() {
    for (let bubble of bubbles) {
        for (let enemy of enemies) {
            if (
                !enemy.captured &&
                bubble.x >= enemy.x &&
                bubble.x <= enemy.x + 40 &&
                bubble.y >= enemy.y &&
                bubble.y <= enemy.y + 40
            ) {
                enemy.captured = true;
            }
        }
    }
}
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updatePlayer();
    updateBubbles();
    updateEnemies();
    checkBubbleCollision();
    drawPlayer(player.x, player.y);
    drawBubbles();
    drawEnemies();
    requestAnimationFrame(gameLoop);
}

gameLoop();
