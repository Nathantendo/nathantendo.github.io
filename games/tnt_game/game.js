const canvas = document.getElementById("gameCanvas");
const lobbyScreen = document.getElementById("lobby-screen");
const lobbyTitle = document.getElementById("lobby-title");
const connectedList = document.getElementById("connected-list");
const lobbyActionMsg = document.getElementById("lobby-action-msg");
const mainMenu = document.getElementById("main-menu");
const settingsMenu = document.getElementById("settings-menu");
const btnPlay = document.getElementById("btn-play");
const btnSettings = document.getElementById("btn-settings");
const btnSettingsBack = document.getElementById("btn-settings-back");
const btnLobbyBack = document.getElementById("btn-lobby-back");
const uiDiv = document.getElementById("html-ui");

// Global Feature Controls configured via UI
let configSFX = true;
let configCameraModifier = 1.0;

// Modify initial Game State
let gameState = "MAIN_MENU";
let matchEndTimer = 0;
let winnerText = "";
let lastTimestamp = 0;

const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "high-performance" }) || canvas.getContext("experimental-webgl");
if (!gl) { alert("WebGL not supported!"); }

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

window.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    }
});

const ARENA_WIDTH = 3200;
const ARENA_HEIGHT = 1400;

const GRAVITY = 0.52;
const RUN_ACCEL = 0.42;
const FRICTION = 0.85;
const MAX_RUN_SPEED = 7.5;
const JUMP_FORCE = -19.0;

let txPlayer, txGround, txCloud, txCrate, txTnt, txExplosion, txParticle, txSky;

const playerColors = [
    "#ff4757", "#2ed573", "#1e90ff", "#ffa502", 
    "#9b59b6", "#00d2d3", "#ff6b81", "#ffda79"
];

let players = {};
let tntList = [];
let crates = [];
let explosions = [];
let particles = [];
let stars = [];

// Generate background stars
for(let i=0; i<150; i++) {
    stars.push({x: Math.random() * ARENA_WIDTH, y: Math.random() * (ARENA_HEIGHT - 300), r: Math.random()*2.5 + 1, alpha: Math.random()*0.5 + 0.5});
}

const platforms = [
    { x: 0, y: ARENA_HEIGHT - 60, w: ARENA_WIDTH, h: 60, isSolid: true },
    { x: 200, y: 1100, w: 400, h: 24, isSolid: false },
    { x: 900, y: 1100, w: 400, h: 24, isSolid: false },
    { x: 1600, y: 1100, w: 400, h: 24, isSolid: false },
    { x: 2300, y: 1100, w: 400, h: 24, isSolid: false },
    { x: 500, y: 850, w: 500, h: 24, isSolid: false },
    { x: 1350, y: 850, w: 500, h: 24, isSolid: false },
    { x: 2200, y: 850, w: 500, h: 24, isSolid: false },
    { x: 150, y: 550, w: 400, h: 24, isSolid: false },
    { x: 1000, y: 550, w: 400, h: 24, isSolid: false },
    { x: 1800, y: 550, w: 400, h: 24, isSolid: false },
    { x: 2650, y: 550, w: 400, h: 24, isSolid: false },
    { x: 600, y: 280, w: 600, h: 24, isSolid: false },
    { x: 2000, y: 280, w: 600, h: 24, isSolid: false }
];

const vsSource = `
    attribute vec2 aVertexPosition; // containing vec4(x_mult, y_mult, u, v) split pattern
    varying vec2 vTexCoord;
    uniform vec3 uCamTrans;
    uniform vec2 uScreenSize;
    uniform vec4 uSpriteTransform; // x, y, width, height
    uniform float uFlipX;
    void main() {
        float u = aVertexPosition.x;
        if(uFlipX > 0.5) u = 1.0 - u;
        vTexCoord = vec2(u, aVertexPosition.y);

        vec2 localPos = aVertexPosition.xy * uSpriteTransform.zw + uSpriteTransform.xy;
        vec2 worldPos = (localPos - uCamTrans.xy) * uCamTrans.z;
        vec2 clipSpace = (worldPos / uScreenSize) * 2.0 - 1.0;
        gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0);
    }
`;

const fsSource = `
    precision mediump float;
    varying vec2 vTexCoord;
    uniform sampler2D uTexture;
    uniform vec4 uColorMask;
    void main() {
        vec4 texel = texture2D(uTexture, vTexCoord);
        if(texel.a < 0.05) discard;
        
        float rgDiff = abs(texel.r - texel.g);
        float gbDiff = abs(texel.g - texel.b);
        
        if(rgDiff < 0.05 && gbDiff < 0.05 && texel.r > 0.15 && texel.r < 0.85) {
            gl_FragColor = vec4(texel.rgb * uColorMask.rgb, texel.a * uColorMask.a);
        } else {
            gl_FragColor = texel * vec4(1.0, 1.0, 1.0, uColorMask.a);
        }
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

const vertexPositionAttribute = gl.getAttribLocation(program, "aVertexPosition");
const camTransUniformLocation = gl.getUniformLocation(program, "uCamTrans");
const screenSizeUniformLocation = gl.getUniformLocation(program, "uScreenSize");
const colorMaskUniformLocation = gl.getUniformLocation(program, "uColorMask");
const spriteTransformUniform = gl.getUniformLocation(program, "uSpriteTransform");
const flipXUniform = gl.getUniformLocation(program, "uFlipX");

// Optimized Static Mesh Buffering 
const quadBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0.0, 0.0,   1.0, 0.0,   0.0, 1.0,
    0.0, 1.0,   1.0, 0.0,   1.0, 1.0
]), gl.STATIC_DRAW);

function drawSprite(texture, x, y, width, height, flipX = false, colorMask = [1,1,1,1]) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform4fv(colorMaskUniformLocation, colorMask);
    gl.uniform4f(spriteTransformUniform, x, y, width, height);
    gl.uniform1f(flipXUniform, flipX ? 1.0 : 0.0);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(vertexPositionAttribute);
    gl.vertexAttribPointer(vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function createProceduralTexture(renderFunc, size = 64) {
    const canvasTx = document.createElement("canvas");
    canvasTx.width = size; canvasTx.height = size;
    const ctxTx = canvasTx.getContext("2d");
    renderFunc(ctxTx, size);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvasTx);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

function initTextures() {
    txPlayer = createProceduralTexture((c, s) => {
        c.fillStyle = "rgba(0,0,0,0.25)";
        c.fillRect(6, s-10, s-12, 8); 
        let gradient = c.createLinearGradient(0,0,0,s);
        gradient.addColorStop(0, "#7f8c8d"); gradient.addColorStop(1, "#4d5656");
        c.fillStyle = gradient;
        c.beginPath(); c.roundRect(10, 14, s-20, s-26, 8); c.fill();
        c.strokeStyle = "#222222"; c.lineWidth = 3; c.stroke();
        c.fillStyle = "#ffffff"; c.fillRect(s-24, 24, 8, 10);
        c.fillStyle = "#2c3e50"; c.fillRect(s-18, 26, 4, 6);
        c.fillStyle = "#1a1a1a";
        c.fillRect(14, s-14, 12, 8); c.fillRect(s-26, s-14, 12, 8);
    });

    txGround = createProceduralTexture((c, s) => {
        let grad = c.createLinearGradient(0, 0, 0, s);
        grad.addColorStop(0, "#1e1105"); grad.addColorStop(1, "#4d300a");
        c.fillStyle = grad; c.fillRect(0, 0, s, s);
        c.fillStyle = "rgba(0, 0, 0, 0.2)"; c.fillRect(0, s * 0.35, s, 4); c.fillRect(0, s * 0.7, s, 5);
        c.fillStyle = "rgba(255, 255, 255, 0.04)"; c.fillRect(0, s * 0.35 + 4, s, 2); c.fillRect(0, s * 0.7 + 5, s, 2);
        c.strokeStyle = "rgba(0, 0, 0, 0.3)"; c.lineWidth = 2;
        for (let i = 0; i <= s; i += s/2) {
            c.beginPath(); c.moveTo(i, 0); c.lineTo(i, s); c.stroke();
        }
        let grassGrad = c.createLinearGradient(0, 0, 0, 16);
        grassGrad.addColorStop(0, "#2ecc71"); grassGrad.addColorStop(1, "#27ae60");
        c.fillStyle = grassGrad; c.fillRect(0, 0, s, 14);
        c.fillStyle = "rgba(255, 255, 255, 0.4)"; c.fillRect(0, 0, s, 2);
        c.fillStyle = "rgba(0, 0, 0, 0.4)"; c.fillRect(0, 14, s, 4);
    });

    txCloud = createProceduralTexture((c, s) => {
        c.clearRect(0, 0, s, s);
        let bodyGrad = c.createLinearGradient(0, 6, 0, s - 12);
        bodyGrad.addColorStop(0, "rgba(30, 41, 59, 0.9)"); bodyGrad.addColorStop(1, "rgba(15, 23, 42, 0.95)");
        c.fillStyle = bodyGrad; c.beginPath(); c.roundRect(4, 6, s - 8, s - 12, 6); c.fill();
        let glowGrad = c.createLinearGradient(0, 0, s, 0);
        glowGrad.addColorStop(0, "#00d2d3"); glowGrad.addColorStop(0.5, "#00a8ff"); glowGrad.addColorStop(1, "#00d2d3");
        c.fillStyle = glowGrad; c.fillRect(8, s - 10, s - 16, 3);
        c.strokeStyle = "rgba(255, 255, 255, 0.15)"; c.lineWidth = 1.5;
        c.beginPath(); c.roundRect(5, 7, s - 10, s - 14, 5); c.stroke();
        c.fillStyle = "rgba(255, 255, 255, 0.2)"; c.fillRect(s/2 - 10, 10, 2, s - 20); c.fillRect(s/2 + 10, 10, 2, s - 20);
    });

    txCrate = createProceduralTexture((c, s) => {
        let grad = c.createLinearGradient(0,0,s,0);
        grad.addColorStop(0, "#ff4757"); grad.addColorStop(1, "#ff6b81");
        c.fillStyle = grad; c.beginPath(); c.arc(s/2, 18, 16, Math.PI, 0); c.fill();
        c.strokeStyle = "rgba(255,255,255,0.7)"; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(s/2-16, 18); c.lineTo(s/2-8, 36); c.moveTo(s/2+16, 18); c.lineTo(s/2+8, 36); c.stroke();
        c.fillStyle = "#d35400"; c.fillRect(s/2-12, 36, 24, 24);
        c.fillStyle = "#e67e22"; c.fillRect(s/2-10, 38, 20, 20);
        c.strokeStyle = "#ba4a00"; c.lineWidth = 2; c.strokeRect(s/2-10, 38, 20, 20);
        c.fillStyle = "#fff"; c.font = "bold 14px Arial"; c.fillText("?", s/2-4, 54);
    });

    txTnt = createProceduralTexture((c, s) => {
        c.fillStyle = "#c0392b"; c.fillRect(4, 4, s-8, s-8);
        c.fillStyle = "#e74c3c"; c.fillRect(8, 8, s-16, s-16);
        c.fillStyle = "#ffffff"; c.fillRect(4, s/2-8, s-8, 16);
        c.fillStyle = "#000000"; c.font = "bold 12px Courier New"; c.fillText("TNT", s/2-11, s/2+5);
        c.strokeStyle = "#7b241c"; c.lineWidth = 3; c.strokeRect(4,4,s-8,s-8);
    });

    txExplosion = createProceduralTexture((c, s) => {
        let radial = c.createRadialGradient(s/2, s/2, 2, s/2, s/2, s/2);
        radial.addColorStop(0, "rgba(255,255,255,1)"); radial.addColorStop(0.3, "rgba(255,230,0,0.85)");
        radial.addColorStop(0.7, "rgba(255,70,0,0.6)"); radial.addColorStop(1, "rgba(255,0,0,0)");
        c.fillStyle = radial; c.beginPath(); c.arc(s/2, s/2, s/2, 0, Math.PI*2); c.fill();
    });

    txParticle = createProceduralTexture((c, s) => {
        let grading = c.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
        grading.addColorStop(0, "#ffeb3b"); grading.addColorStop(0.4, "#ff9800"); grading.addColorStop(1, "rgba(231,76,60,0)");
        c.fillStyle = grading; c.beginPath(); c.arc(s/2, s/2, s/2, 0, Math.PI*2); c.fill();
    }, 16);

    txSky = createProceduralTexture((c, s) => {
        let grad = c.createLinearGradient(0,0,0,s);
        grad.addColorStop(0, "#070b19"); grad.addColorStop(0.6, "#111a36"); grad.addColorStop(1, "#1b2a57");
        c.fillStyle = grad; c.fillRect(0,0,s,s);
    }, 128);
}
initTextures();

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(freq, type, duration) {
    if (!configSFX || !audioCtx || audioCtx.state === 'suspended') return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if(type === 'sawtooth') osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + duration);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
}

let nextDropTime = 0;

window.addEventListener("gamepadconnected", (e) => { 
    if (gameState === "LOBBY") addNewPlayer(e.gamepad.index); 
});
window.addEventListener("gamepaddisconnected", (e) => { 
    if (gameState === "LOBBY") delete players[e.gamepad.index]; 
});

function hexToRgbVec(hex) {
    let num = parseInt(hex.replace("#",""), 16);
    return [((num >> 16) & 255)/255, ((num >> 8) & 255)/255, (num & 255)/255, 1.0];
}

function addNewPlayer(index) {
    const randomX = Math.random() * (ARENA_WIDTH - 400) + 200;
    const randomY = Math.random() * 300 + 750; 
    const assignedColor = playerColors[index % playerColors.length];

    players[index] = {
        x: randomX, y: randomY, vx: 0, vy: 0, w: 36, h: 52,
        facing: Math.random() > 0.5 ? 1 : -1, grounded: false,
        colorHex: assignedColor, colorVec: hexToRgbVec(assignedColor), 
        score: 0, lastShot: 0, id: index + 1, dropTimer: 0, tntAmmo: 5, disqualified: false
    };
    uiDirty = true;
}

function resetRound() {
    tntList = []; crates = []; explosions = []; particles = [];
    for (let index in players) {
        const p = players[index];
        p.x = Math.random() * (ARENA_WIDTH - 400) + 200; p.y = Math.random() * 300 + 750;
        p.vx = 0; p.vy = 0; p.tntAmmo = 5; p.disqualified = false; p.grounded = false;
        p.facing = Math.random() > 0.5 ? 1 : -1;
    }
    gameState = "PLAYING";
    lobbyScreen.style.display = "none";
    uiDirty = true;
}

function spawnSupplyDrop() {
    crates.push({
        x: Math.random() * (ARENA_WIDTH - 200) + 100, y: -60, vy: 2.0, w: 48, h: 48,
        ammoAmount: Math.floor(Math.random() * 3) + 4, bobSeed: Math.random() * 100
    });
}

const keysPressed = {};
window.addEventListener("keydown", (e) => { keysPressed[e.code] = true; });
window.addEventListener("keyup", (e) => { keysPressed[e.code] = false; });

function updateInput(timestamp) {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const keys = Object.keys(players);
    
    if (gameState === "LOBBY") {
        for (let i = 0; i < gamepads.length; i++) {
            const gp = gamepads[i];
            if (gp && gp.buttons.some(b => b.pressed) && !players[gp.index]) {
                if (audioCtx.state === 'suspended') audioCtx.resume();
                addNewPlayer(gp.index);
                playSound(440, 'square', 0.15);
                return;
            }
        }
        if ((keysPressed["Space"] || keysPressed["Enter"]) && !players[99]) {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            addNewPlayer(99); 
            players[99].colorHex = "#ffffff";
            players[99].colorVec = [1, 1, 1, 1];
            playSound(440, 'square', 0.15);
            keysPressed["Space"] = false; keysPressed["Enter"] = false;
            return;
        }
        if (keys.length > 0) {
            let startTriggered = false;
            if (gamepads[keys[0]]?.buttons[0]?.pressed) startTriggered = true;
            if (keysPressed["Space"] || keysPressed["Enter"]) startTriggered = true;
            if (startTriggered) {
                playSound(580, 'square', 0.3);
                resetRound();
            }
        }
        return;
    }

    if (players[99] && !players[99].disqualified) {
        const kp = players[99];
        let moveLeft = keysPressed["KeyA"] || keysPressed["ArrowLeft"];
        let moveRight = keysPressed["KeyD"] || keysPressed["ArrowRight"];
        let dropPlatform = keysPressed["KeyS"] || keysPressed["ArrowDown"];
        let jumpPressed = keysPressed["KeyW"] || keysPressed["ArrowUp"] || keysPressed["Space"];
        let shootPressed = keysPressed["KeyF"] || keysPressed["Numpad0"] || keysPressed["ShiftLeft"];

        if (moveLeft) { kp.vx -= RUN_ACCEL; kp.facing = -1; }
        else if (moveRight) { kp.vx += RUN_ACCEL; kp.facing = 1; }
        else { kp.vx *= FRICTION; }

        if (kp.vx > MAX_RUN_SPEED) kp.vx = MAX_RUN_SPEED;
        if (kp.vx < -MAX_RUN_SPEED) kp.vx = -MAX_RUN_SPEED;

        if (jumpPressed && kp.grounded) {
            kp.vy = JUMP_FORCE; kp.grounded = false;
            playSound(380, 'square', 0.12);
        }
        if (!jumpPressed && kp.vy < -4) kp.vy = -4;
        if (dropPlatform) kp.dropTimer = 15;
        if (kp.dropTimer > 0) kp.dropTimer--;

        if (shootPressed && timestamp - kp.lastShot > 350) {
            if (kp.tntAmmo > 0) {
                kp.tntAmmo--;
                tntList.push({
                    x: kp.facing === 1 ? kp.x + kp.w + 5 : kp.x - 22, y: kp.y + 4,
                    vx: (kp.facing * 8.5) + (kp.vx * 0.45), vy: -6.5,
                    w: 24, h: 24, bounceCount: 0, ownerIndex: 99, spawnTime: timestamp
                });
                playSound(240, 'triangle', 0.08);
                uiDirty = true;
            } else { playSound(150, 'square', 0.04); }
            kp.lastShot = timestamp;
        }
    }

    for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (!gp || !players[gp.index] || gp.index === 99 || players[gp.index].disqualified) continue;
        const p = players[gp.index];

        let moveLeft = false; let moveRight = false; let dropPlatform = false;
        const deadzone = 0.25;
        let rawX = gp.axes[0] !== undefined ? gp.axes[0] : 0;
        let rawY = gp.axes[1] !== undefined ? gp.axes[1] : 0;

        if (rawX < -deadzone || gp.buttons[14]?.pressed) moveLeft = true;
        if (rawX > deadzone || gp.buttons[15]?.pressed) moveRight = true;
        if (rawY > deadzone || gp.buttons[13]?.pressed) dropPlatform = true;

        if (moveLeft) { p.vx -= RUN_ACCEL; p.facing = -1; }
        else if (moveRight) { p.vx += RUN_ACCEL; p.facing = 1; }
        else { p.vx *= FRICTION; }

        if (p.vx > MAX_RUN_SPEED) p.vx = MAX_RUN_SPEED;
        if (p.vx < -MAX_RUN_SPEED) p.vx = -MAX_RUN_SPEED;

        if (gp.buttons[0]?.pressed) {
            if (p.grounded) { p.vy = JUMP_FORCE; p.grounded = false; playSound(380, 'square', 0.12); }
        } else { if (p.vy < -4) p.vy = -4; }

        if (dropPlatform) p.dropTimer = 15;
        if (p.dropTimer > 0) p.dropTimer--;

        let shootPressed = gp.buttons[2]?.pressed || gp.buttons[1]?.pressed;
        if (shootPressed && timestamp - p.lastShot > 350) {
            if (p.tntAmmo > 0) {
                p.tntAmmo--;
                tntList.push({
                    x: p.facing === 1 ? p.x + p.w + 5 : p.x - 22, y: p.y + 4,
                    vx: (p.facing * 8.5) + (p.vx * 0.45), vy: -6.5,
                    w: 24, h: 24, bounceCount: 0, ownerIndex: gp.index, spawnTime: timestamp
                });
                playSound(240, 'triangle', 0.08);
                uiDirty = true;
            } else { playSound(150, 'square', 0.04); }
            p.lastShot = timestamp;
        }
    }
}

function updatePhysics(timestamp, dt) {
    // Normalizing dynamic physics frames via delta factor
    const f = dt / 16.666; 

    for(let i = particles.length - 1; i >= 0; i--) {
        let pt = particles[i];
        pt.x += pt.vx * f; pt.y += pt.vy * f; pt.vy += 0.15 * f; pt.life -= 0.02 * f;
        if(pt.life <= 0) particles.splice(i,1);
    }

    for (let index in players) {
        const p = players[index];
        if (p.disqualified) continue;

        p.vy += GRAVITY * f; p.x += p.vx * f; p.y += p.vy * f;

        if (p.x < 0) { p.x = 0; p.vx = 0; }
        if (p.x > ARENA_WIDTH - p.w) { p.x = ARENA_WIDTH - p.w; p.vx = 0; }

        p.grounded = false;
        platforms.forEach(plat => {
            if (p.x + p.w > plat.x && p.x < plat.x + plat.w) {
                if (plat.isSolid && p.y + p.h >= plat.y && p.y + p.h - (p.vy * f) <= plat.y + 15) {
                    p.y = plat.y - p.h; p.vy = 0; p.grounded = true;
                } else if (!plat.isSolid && p.dropTimer === 0) {
                    if (p.vy >= 0 && p.y + p.h >= plat.y && p.y + p.h - (p.vy * f) <= plat.y + 12) {
                        p.y = plat.y - p.h; p.vy = 0; p.grounded = true;
                    }
                }
            }
        });

        for (let i = crates.length - 1; i >= 0; i--) {
            const c = crates[i];
            if (p.x + p.w > c.x && p.x < c.x + c.w && p.y + p.h > c.y && p.y < c.y + c.h) {
                p.tntAmmo += c.ammoAmount;
                playSound(520, 'square', 0.2);
                crates.splice(i, 1);
                uiDirty = true;
            }
        }
    }

    for (let i = crates.length - 1; i >= 0; i--) {
        const c = crates[i]; c.y += c.vy * f;
        platforms.forEach(plat => {
            if (c.x + c.w > plat.x && c.x < plat.x + plat.w) {
                if (c.y + c.h >= plat.y && c.y + c.h - (c.vy * f) <= plat.y + 10) {
                    c.y = plat.y - c.h; c.vy = 0;
                }
            }
        });
        if (c.y > ARENA_HEIGHT) crates.splice(i, 1);
    }

    for (let i = tntList.length - 1; i >= 0; i--) {
        const tnt = tntList[i]; tnt.vy += GRAVITY * f; tnt.x += tnt.vx * f; tnt.y += tnt.vy * f;
        let exploded = false;

        platforms.forEach(plat => {
            if (tnt.x + tnt.w > plat.x && tnt.x < plat.x + plat.w) {
                if (tnt.y + tnt.h >= plat.y && tnt.y + tnt.h - (tnt.vy * f) <= plat.y + 12 && tnt.vy >= 0) {
                    tnt.y = plat.y - tnt.h; tnt.vy = -tnt.vy * 0.52; tnt.vx *= 0.78;
                    tnt.bounceCount++;
                    if (tnt.bounceCount >= 3 || Math.abs(tnt.vx) < 0.2) exploded = true;
                }
            }
        });

        for (let index in players) {
            const p = players[index];
            if (p.disqualified || parseInt(index) === tnt.ownerIndex) continue;
            if (tnt.x + tnt.w > p.x && tnt.x < p.x + p.w && tnt.y + tnt.h > p.y && tnt.y < p.y + p.h) exploded = true;
        }

        if (exploded) {
            triggerExplosion(tnt); tntList.splice(i, 1);
        } else if (tnt.y > ARENA_HEIGHT || tnt.x < 0 || tnt.x > ARENA_WIDTH) {
            tntList.splice(i, 1);
        }
    }

    for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i]; exp.life -= 0.035 * f;
        if (exp.life <= 0) explosions.splice(i, 1);
    }
}

function triggerExplosion(tnt) {
    explosions.push({ x: tnt.x + tnt.w/2, y: tnt.y + tnt.h/2, maxRadius: 140, life: 1.0 });
    playSound(85, 'sawtooth', 0.45);
    const ex = tnt.x + tnt.w/2; const ey = tnt.y + tnt.h/2;

    for(let k=0; k<25; k++){
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 7 + 4;
        particles.push({
            x: ex, y: ey,
            vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
            life: 1.0, size: Math.random()*8 + 6
        });
    }

    for (let index in players) {
        const p = players[index];
        if (p.disqualified) continue;

        const px = p.x + p.w/2; const py = p.y + p.h/2;
        const dist = Math.hypot(px - ex, py - ey);

        if (dist < 115) {
            p.disqualified = true; 
            playSound(110, 'sawtooth', 0.65);
            if (parseInt(index) !== tnt.ownerIndex && players[tnt.ownerIndex]) {
                players[tnt.ownerIndex].score += 1;
            }
            uiDirty = true;
        }
    }
}

function checkEliminationStates(timestamp) {
    const playerKeys = Object.keys(players);
    if (playerKeys.length === 0) return;

    const activePlayers = playerKeys.filter(k => !players[k].disqualified);

    if (activePlayers.length <= 1) {
        gameState = "MATCH_OVER";
        matchEndTimer = timestamp + 3200;
        
        if (activePlayers.length === 1) {
            const winner = players[activePlayers[0]];
            winnerText = `PLAYER ${winner.id} WINS THE ROUND!`;
            playSound(620, 'square', 0.45);
        } else {
            winnerText = "MUTUAL ANNIHILATION!";
        }
        uiDirty = true;
    }
}

let currentCam = { x: 0, y: 0, scale: 1.0 };
function calculateCamera() {
    const activeKeys = Object.keys(players).filter(k => !players[k].disqualified);
    if (activeKeys.length === 0) return { x: ARENA_WIDTH/2 - canvas.width/2, y: ARENA_HEIGHT - canvas.height, scale: 1.0 };

    let minX = ARENA_WIDTH, maxX = 0, minY = ARENA_HEIGHT, maxY = 0;
    activeKeys.forEach(k => {
        const p = players[k];
        if (p.x < minX) minX = p.x; if (p.x + p.w > maxX) maxX = p.x + p.w;
        if (p.y < minY) minY = p.y; if (p.y + p.h > maxY) maxY = p.y + p.h;
    });

    const padding = 180;
    minX = Math.max(0, minX - padding); maxX = Math.min(ARENA_WIDTH, maxX + padding);
    minY = Math.max(0, minY - padding); maxY = Math.min(ARENA_HEIGHT, maxY + padding);

    const boxWidth = maxX - minX; const boxHeight = maxY - minY;
    let targetScale = Math.min(canvas.width / boxWidth, canvas.height / boxHeight);
    targetScale = Math.max(0.42 * configCameraModifier, Math.min(1.1 * configCameraModifier, targetScale * configCameraModifier));

    let targetCamX = (minX + maxX)/2 - (canvas.width / targetScale)/2;
    let targetCamY = (minY + maxY)/2 - (canvas.height / targetScale)/2;

    targetCamX = Math.max(0, Math.min(ARENA_WIDTH - canvas.width / targetScale, targetCamX));
    targetCamY = Math.max(0, Math.min(ARENA_HEIGHT - canvas.height / targetScale, targetCamY));

    currentCam.scale += (targetScale - currentCam.scale) * 0.08;
    currentCam.x += (targetCamX - currentCam.x) * 0.08;
    currentCam.y += (targetCamY - currentCam.y) * 0.08;

    return currentCam;
}

function renderWebGL(timestamp) {
    gl.clearColor(0.02, 0.04, 0.08, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let cam = calculateCamera();
    gl.uniform2f(screenSizeUniformLocation, canvas.width, canvas.height);
    gl.uniform3f(camTransUniformLocation, cam.x, cam.y, cam.scale);

    drawSprite(txSky, cam.x, cam.y, canvas.width / cam.scale, canvas.height / cam.scale);

    stars.forEach(s => {
        let twinkle = Math.sin(timestamp * 0.005 + s.x) * 0.25 + 0.75;
        drawSprite(txParticle, s.x, s.y, s.r * 2, s.r * 2, false, [1, 1, 1, s.alpha * twinkle]);
    });

    platforms.forEach(p => {
        let size = 64;
        for (let sx = p.x; sx < p.x + p.w; sx += size) {
            let chunkW = Math.min(size, (p.x + p.w) - sx);
            drawSprite(p.isSolid ? txGround : txCloud, sx, p.y, chunkW, p.h);
        }
    });

    crates.forEach(c => {
        let bobbing = Math.sin(timestamp * 0.004 + c.bobSeed) * 4;
        drawSprite(txCrate, c.x, c.y + bobbing, c.w, c.h);
    });

    tntList.forEach(tnt => {
        let flash = Math.floor(timestamp / 120) % 2 === 0;
        let mask = flash ? [2.0, 1.5, 1.5, 1.0] : [1, 1, 1, 1];
        drawSprite(txTnt, tnt.x, tnt.y, tnt.w, tnt.h, false, mask);
    });

    for (let index in players) {
        const p = players[index];
        if (p.disqualified) continue;
        drawSprite(txPlayer, p.x, p.y, p.w, p.h, p.facing === -1, p.colorVec);
    }

    particles.forEach(pt => {
        drawSprite(txParticle, pt.x - pt.size/2, pt.y - pt.size/2, pt.size, pt.size, false, [1, 0.6, 0.2, pt.life]);
    });

    explosions.forEach(exp => {
        let curR = exp.maxRadius * (1.0 - exp.life);
        drawSprite(txExplosion, exp.x - curR, exp.y - curR, curR * 2, curR * 2, false, [1, 1, 1, exp.life]);
    });
}

// Optimization Flag: Prevent layout thrashing by checking state changes
let lastGameState = null;
let uiDirty = true;

function updateHTMLUI() {
    if (gameState !== lastGameState) {
        mainMenu.style.display = (gameState === "MAIN_MENU") ? "block" : "none";
        settingsMenu.style.display = (gameState === "SETTINGS") ? "block" : "none";
        lobbyScreen.style.display = (gameState === "LOBBY") ? "block" : "none";
        uiDiv.style.display = (gameState === "PLAYING" || gameState === "MATCH_OVER") ? "flex" : "none";
        lastGameState = gameState;
        uiDirty = true;
    }

    if (!uiDirty) return; 

    if (gameState === "LOBBY") {
        const keys = Object.keys(players);
        if (keys.length === 0) {
            lobbyTitle.innerText = "WAITING FOR CONTROLLERS...";
            connectedList.innerHTML = "<span style='color:#718096;'>Connect a gamepad and tap any button to join</span>";
            lobbyActionMsg.style.display = "none";
        } else {
            lobbyTitle.innerText = "BATTLE LOBBY ACTIVE";
            let htmlList = "";
            keys.forEach(k => {
                const p = players[k];
                htmlList += `<div style="color:${p.colorHex}">✦ PLAYER ${p.id} READY</div>`;
            });
            connectedList.innerHTML = htmlList;
            lobbyActionMsg.style.display = "block";
        }
    } 
    else if (gameState === "PLAYING" || gameState === "MATCH_OVER") {
        let uiHTML = "";
        for (let index in players) {
            const p = players[index];
            if (p.disqualified) {
                uiHTML += `<div style="color:#718096; text-decoration:line-through; opacity:0.5;">P${p.id}: OUT</div>`;
            } else {
                uiHTML += `<div style="color:${p.colorHex}">P${p.id}: ${p.tntAmmo}🧨 [★:${p.score}]</div>`;
            }
        }

        if (gameState === "MATCH_OVER") {
            uiHTML = `<div style="color:#ffeb3b; font-size:22px; letter-spacing:1px; animation:blink 0.6s infinite;">${winnerText}</div>`;
            if (performance.now() > matchEndTimer) {
                resetRound();
            }
        }
        uiDiv.innerHTML = uiHTML;
    }
    uiDirty = false;
}

function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    let dt = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    // Cap delta timing spikes during background/focus changes
    if (dt > 100) dt = 16.66; 

    if (gameState === "PLAYING" && timestamp > nextDropTime) {
        spawnSupplyDrop();
        nextDropTime = timestamp + Math.random() * 3000 + 3500;
    }
    
    updateInput(timestamp);
    
    if (gameState === "PLAYING") {
        updatePhysics(timestamp, dt);
        checkEliminationStates(timestamp);
    }
    
    renderWebGL(timestamp);
    updateHTMLUI();
    requestAnimationFrame(gameLoop);
}

// Initial engine boot loop setup
function initEngine(timestamp) {
    lastTimestamp = timestamp;
    updateInput(timestamp);
    renderWebGL(timestamp);
    updateHTMLUI();
    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(initEngine);

btnPlay.addEventListener("click", (e) => {
    e.stopPropagation();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    gameState = "LOBBY";
});

btnSettings.addEventListener("click", (e) => {
    e.stopPropagation();
    gameState = "SETTINGS";
});

btnSettingsBack.addEventListener("click", (e) => {
    e.stopPropagation();
    gameState = "MAIN_MENU";
});

btnLobbyBack.addEventListener("click", (e) => {
    e.stopPropagation();
    gameState = "MAIN_MENU";
});

document.getElementById("setting-sfx").addEventListener("change", (e) => {
    configSFX = e.target.checked;
});

document.getElementById("setting-arena").addEventListener("change", (e) => {
    const val = e.target.value;
    if (val === "zoomed") configCameraModifier = 1.2;
    else if (val === "wide") configCameraModifier = 0.8;
    else configCameraModifier = 1.0;
});