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
    leftPaddle.y += leftPaddle.dy;
    rightPaddle.y += rightPaddle.dy;
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

// **Touch Controls**
canvas.addEventListener("touchmove", (e) => {
    const touch = e.touches[0];
    const touchX = touch.clientX;
    const touchY = touch.clientY;

    if (touchX < canvas.width / 2) {
        leftPaddle.y = touchY - paddleHeight / 2;
    } else {
        rightPaddle.y = touchY - paddleHeight / 2;
    }
});
