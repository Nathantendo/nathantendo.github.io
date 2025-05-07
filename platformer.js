const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const gravity = 0.5;
const player = {
    x: 100, y: canvas.height - 150, width: 40, height: 60, dy: 0, jumping: false
};

const groundHeight = 100;
const platforms = [{ x: 200, y: canvas.height - 200, width: 100, height: 20 }];
const keys = {};

function draw() {
    ctx.fillStyle = "skyblue";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "green";
    ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);

    ctx.fillStyle = "red";
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = "brown";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));
}

function update() {
    if (keys["ArrowLeft"]) player.x -= 5;
    if (keys["ArrowRight"]) player.x += 5;

    if (keys["ArrowUp"] && !player.jumping) {
        player.dy = -10;
        player.jumping = true;
    }

    player.dy += gravity;
    player.y += player.dy;

    if (player.y + player.height >= canvas.height - groundHeight) {
        player.y = canvas.height - groundHeight - player.height;
        player.dy = 0;
        player.jumping = false;
    }

    platforms.forEach(p => {
        if (player.y + player.height >= p.y && player.y + player.height <= p.y + p.height &&
            player.x + player.width > p.x && player.x < p.x + p.width) {
            player.y = p.y - player.height;
            player.dy = 0;
            player.jumping = false;
        }
    });

    requestAnimationFrame(loop);
}

function loop() {
    draw();
    update();
}

loop();

window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const gravity = 0.6;
const player = {
    x: 100, y: canvas.height - 150, width: 40, height: 60, dy: 0, jumping: false, sprite: new Image()
};
player.sprite.src = "player.png"; // Add a custom sprite

const groundHeight = 100;
const platforms = [{ x: 300, y: canvas.height - 200, width: 150, height: 20 }];
const keys = {};
let score = 0;

function draw() {
    ctx.fillStyle = "#5c94fc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#228B22"; 
    ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);

    ctx.drawImage(player.sprite, player.x, player.y, player.width, player.height);

    ctx.fillStyle = "#8B4513"; 
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));
}

function update() {
    if (keys["ArrowLeft"]) player.x -= 5;
    if (keys["ArrowRight"]) player.x += 5;

    if (keys["ArrowUp"] && !player.jumping) {
        player.dy = -12;
        player.jumping = true;
    }

    player.dy += gravity;
    player.y += player.dy;

    if (player.y + player.height >= canvas.height - groundHeight) {
        player.y = canvas.height - groundHeight - player.height;
        player.dy = 0;
        player.jumping = false;
    }

    platforms.forEach(p => {
        if (player.y + player.height >= p.y && player.y + player.height <= p.y + p.height &&
            player.x + player.width > p.x && player.x < p.x + p.width) {
            player.y = p.y - player.height;
            player.dy = 0;
            player.jumping = false;
        }
    });

    document.getElementById("score").innerText = score;

    requestAnimationFrame(loop);
}

function loop() {
    draw();
    update();
}

loop();

// Controls
window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);
