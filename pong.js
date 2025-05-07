const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const paddleWidth = 10, paddleHeight = canvas.height * 0.2;
const ballSize = 15;

const leftPaddle = { x: 20, y: canvas.height / 2 - paddleHeight / 2, dy: 0 };
const rightPaddle = { x: canvas.width - 30, y: canvas.height / 2 - paddleHeight / 2, dy: 0 };

const ball = { x: canvas.width / 2, y: canvas.height / 2, dx: 5, dy: 5 };

// Store active keys
const keys = {};

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

function update() {
    if (keys["w"]) leftPaddle.y -= 5;
    if (keys["s"]) leftPaddle.y += 5;
    if (keys["ArrowUp"]) rightPaddle.y -= 5;
    if (keys["ArrowDown"]) rightPaddle.y += 5;

    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.y <= 0 || ball.y >= canvas.height) ball.dy *= -1;
    
    if ((ball.x <= leftPaddle.x + paddleWidth && ball.y >= leftPaddle.y && ball.y <= leftPaddle.y + paddleHeight) ||
        (ball.x >= rightPaddle.x && ball.y >= rightPaddle.y && ball.y <= rightPaddle.y + paddleHeight)) {
        ball.dx *= -1;
    }

    requestAnimationFrame(loop);
}

function loop() {
    draw();
    update();
}

loop();

// **Track multiple keys for simultaneous movement**
window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});
