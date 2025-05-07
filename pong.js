const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 400;

const paddleWidth = 10, paddleHeight = 100;
const ballSize = 10;

// Paddle objects
const leftPaddle = { x: 10, y: canvas.height / 2 - paddleHeight / 2, dy: 0 };
const rightPaddle = { x: canvas.width - 20, y: canvas.height / 2 - paddleHeight / 2, dy: 0 };

// Ball object
const ball = { x: canvas.width / 2, y: canvas.height / 2, dx: 4, dy: 4 };

// Draw function
function draw() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "white";
    ctx.fillRect(leftPaddle.x, leftPaddle.y, paddleWidth, paddleHeight);
    ctx.fillRect(rightPaddle.x, rightPaddle.y, paddleWidth, paddleHeight);
    
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballSize, 0, Math.PI * 2);
    ctx.fill();
}

// Update function
function update() {
    leftPaddle.y += leftPaddle.dy;
    rightPaddle.y += rightPaddle.dy;

    ball.x += ball.dx;
    ball.y += ball.dy;

    // Ball collisions
    if (ball.y <= 0 || ball.y >= canvas.height) ball.dy *= -1;
    
    if (ball.x <= leftPaddle.x + paddleWidth && ball.y >= leftPaddle.y && ball.y <= leftPaddle.y + paddleHeight ||
        ball.x >= rightPaddle.x && ball.y >= rightPaddle.y && ball.y <= rightPaddle.y + paddleHeight) {
        ball.dx *= -1;
    }

    requestAnimationFrame(loop);
}

// Game loop
function loop() {
    draw();
    update();
}

loop();

// Paddle controls
window.addEventListener("keydown", (e) => {
    if (e.key === "w") leftPaddle.dy = -5;
    if (e.key === "s") leftPaddle.dy = 5;
    if (e.key === "ArrowUp") rightPaddle.dy = -5;
    if (e.key === "ArrowDown") rightPaddle.dy = 5;
});

window.addEventListener("keyup", () => {
    leftPaddle.dy = 0;
    rightPaddle.dy = 0;
});
