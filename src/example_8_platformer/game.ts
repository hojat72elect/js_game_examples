/**
 *  2D JS Platforming Game:
 *     - Includes destructible terrain
 *     - Control with keyboard, mouse, touch, or gamepad
 */
import {
    cameraScale,
    clamp,
    engineInit,
    fetchJSON,
    FollowCamera,
    keyWasPressed,
    levelEditor,
    mainCanvasSize,
    mainContext,
    mousePos,
    mouseWheel,
    setCameraScale,
    setCanvasMaxAspect,
    setCanvasMinAspect,
    setGravity,
    setObjectDefaultAngleDamping,
    setObjectDefaultDamping,
    setTouchGamepadEnable,
    tile,
    vec2
} from "littlejsengine";
import {buildLevel, getCameraOffset, levelSize, playerStartPos} from "./gameLevel.ts";
import {Player} from "./gamePlayer.ts";
import {explosion, sound_jump} from "./gameEffects.ts";
import {Crate, Enemy} from "./gameObjects.ts";


// globals
export let gameLevelData: any;
export let spriteAtlas: any;
export let player: any;
export let camera: any;
export let score: any;
export let deaths: any;

export function addToScore(delta = 1) {
    score += delta;
}

export function addToDeaths() {
    ++deaths;
}

// enable touch gamepad on touch devices
setTouchGamepadEnable(true);

// limit canvas aspect ratios to support most modern HD devices
setCanvasMinAspect(.4);
setCanvasMaxAspect(2.5);

function loadLevel() {
    // setup level
    buildLevel();

    // spawn player
    player = new Player(playerStartPos);

    // the camera follows the player, showing more of the way it runs, and keeps the view over the level
    camera = new FollowCamera(player, .15);
    camera.offset = getCameraOffset();
    camera.deadZone = vec2(1, 3);
    camera.lookAhead = vec2(3, 0);
    camera.boundsMin = vec2();
    camera.boundsMax = vec2(levelSize.x, Infinity);
    camera.snap();

    // init game
    score = deaths = 0;
}

async function gameInit() {
    // load the game level data
    gameLevelData = await fetchJSON('gameLevelData.json');

    // engine settings
    setGravity(vec2(0, -.01));
    setObjectDefaultDamping(.99);
    setObjectDefaultAngleDamping(.99);
    setCameraScale(4 * 16);

    // create a table of all sprites
    const gameTile = (i: any, size: number = 16) => tile(i, size, 0, 1);
    spriteAtlas =
        {
            // large tiles
            circle: gameTile(0),
            crate: gameTile(1),
            player: gameTile(2),
            enemy: gameTile(4),
            coin: gameTile(5),

            // small tiles
            gun: gameTile(vec2(0, 2), 8),
            grenade: gameTile(vec2(1, 2), 8),
        };

    loadLevel();

    // the level editor's Restart button (Esc then 0) rebuilds the level with its changes, and its Play from mouse
    // puts the player where the mouse is
    levelEditor.onRestart = loadLevel;
    levelEditor.onPlayFrom = (pos) => {
        player.pos = pos.copy();
        player.velocity = vec2();
    };
}

function gameUpdate() {
    // respawn player
    if (player.deadTimer > 1) {
        player = new Player(playerStartPos);
        player.velocity = vec2(0, .1);
        sound_jump.play();
        camera.target = player;
    }

    // mouse wheel = zoom, the camera keeps the player the same height above the middle of the view
    setCameraScale(clamp(cameraScale * (1 - mouseWheel / 10), 1, 1e3));
    camera.offset = getCameraOffset();

    // T = drop test crate
    if (keyWasPressed('KeyT'))
        new Crate(mousePos);

    // E = drop enemy
    if (keyWasPressed('KeyE'))
        new Enemy(mousePos);

    // B = make explosion
    if (keyWasPressed('KeyB'))
        explosion(mousePos);

    // M = move player to mouse
    if (keyWasPressed('KeyM'))
        player.pos = mousePos.copy();

    // R = restart level
    if (keyWasPressed('KeyR'))
        loadLevel();
}

function gameUpdatePost() {
}

function gameRender() {
}

function gameRenderPost() {
    // draw to main canvas for hud rendering
    const drawText = (text: any, x: any, y: any, size: number = 40) => {
        const context = mainContext;
        context.textAlign = 'center';
        context.textBaseline = 'top';
        context.font = size + 'px arial';
        context.fillStyle = '#fff';
        context.lineWidth = 3;
        context.strokeText(text, x, y);
        context.fillText(text, x, y);
    }
    drawText('Score: ' + score, mainCanvasSize.x / 4, 20);
    drawText('Deaths: ' + deaths, mainCanvasSize.x * 3 / 4, 20);
}

// Starting up the engine
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, ['tiles.png', 'tilesLevel.png']);