/**
 * JavaScript Breakout Game
 */
import {
    cameraPos,
    drawRect,
    engineImageFont,
    engineInit,
    engineObjectsDestroy,
    gamepadWasPressed,
    hsl,
    keyWasPressed,
    mouseWasPressed,
    postProcessEffects,
    PostProcessPlugin,
    postProcessTV,
    setCameraPos,
    setCameraScale,
    setCanvasFixedSize,
    vec2
} from "littlejsengine";
import {Ball, Brick, Paddle, Wall} from "./gameObjects.ts";

// game objects
export let ball: any;
export let score: number;
export let brickCount: number;
export let paddle: Paddle;

export const levelSize = vec2(38, 20);

export function changeBrickCount(delta: number) {
    brickCount += delta;

    // increase score when brick is destroyed
    if (delta < 0)
        score -= delta;
}

function gameReset() {
    // reset game objects
    engineObjectsDestroy();
    score = 0;
    brickCount = 0;

    // spawn bricks
    const pos = vec2();
    for (pos.x = 4; pos.x <= levelSize.x - 4; pos.x += 2)
        for (pos.y = 12; pos.y <= levelSize.y - 2; pos.y += 1)
            new Brick(pos);

    // create walls
    new Wall(vec2(-.5, levelSize.y / 2), vec2(1, 100)); // left
    new Wall(vec2(levelSize.x + .5, levelSize.y / 2), vec2(1, 100)); // right
    new Wall(vec2(levelSize.x / 2, levelSize.y + .5), vec2(100, 1)); // top

    // spawn player paddle
    paddle = new Paddle(vec2(levelSize.x / 2 - 12, 1));

    // reset ball
    ball = 0;
}

function gameInit() {
    setCanvasFixedSize(vec2(1920, 1080)); // 1080p
    setCameraPos(levelSize.scale(.5)); // center camera
    setCameraScale(48);

    // set up a post processing shader
    setupPostProcess();

    // start a new game
    gameReset();
}

function gameUpdate() {
    // spawn ball
    if (!ball && (mouseWasPressed(0) || gamepadWasPressed(0)))
        ball = new Ball(vec2(levelSize.x / 2, levelSize.y / 2));

    if (ball && ball.pos.y < -1) {
        // destroy ball if it goes below the level
        ball.destroy();
        ball = 0;
    }

    if (keyWasPressed('KeyR'))
        gameReset();
}

function gameUpdatePost() {
}

function gameRender() {
    // draw a the background
    drawRect(cameraPos, levelSize.scale(2), hsl(0, 0, .5));
    drawRect(cameraPos, levelSize, hsl(0, 0, .02));
}

function gameRenderPost() {
    // use built in image font for text
    const font = engineImageFont;
    font.drawText('Score: ' + score, cameraPos.add(vec2(0, 9.2)), 1);
    if (!brickCount)
        font.drawText('You Win!', cameraPos.add(vec2(0, -5)), 2);
    else if (!ball)
        font.drawText('Click to Play', cameraPos.add(vec2(0, -5)), 2);
}

// the look of an old TV, built in: static, scan lines, a soft glow and a vignette
function setupPostProcess() {
    const tv = postProcessTV({scanlines: .6});
    new PostProcessPlugin(postProcessEffects(tv));
}

// Startup LittleJS Engine
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, ['tiles.png']);