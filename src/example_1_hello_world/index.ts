import {drawTextScreen, engineInit, mainCanvasSize, mousePos, mouseWasPressed, particleEffect} from "littlejsengine";

/**
 * called once after the engine starts.
 */
function gameInit() {}

/**
 * Called 60 times a second for game logic.
 */
function gameUpdate() {
    if (mouseWasPressed(0)) {
        particleEffect('explosion', mousePos);
    }
}

/**
 * called after physics, even when paused.
 */
function gameUpdatePost() {}

/**
 * Called before objects are drawn.
 */
function gameRender() {}

/**
 * Called after objects are drawn.
 */
function gameRenderPost() {
    drawTextScreen('Hello World!', mainCanvasSize.scale(0.5), 40);
}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);