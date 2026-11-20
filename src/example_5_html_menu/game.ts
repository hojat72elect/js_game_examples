/*
    Little JS HTML Menu Example Project
    - Setup a simple html menu system
    - Menu can be opened and closed
    - Pauses game when menu is visible
    - Shows several input types
*/
import {
    drawTextScreen,
    drawTile, engineInit,
    hsl, keyWasPressed, mainCanvasSize, mousePos, mouseWasPressed,
    setCanvasClearColor,
    setInputPreventDefault, setPaused,
    setTileDefaultPadding, sin,
    Sound,
    tile, time,
    vec2
} from "littlejsengine";

// each tile in tiles.png has a 1 pixel border, which stops texture bleeding
setTileDefaultPadding(1);

// create a sound for click.
const clickSound = new Sound([1, .5]);

// html menu system, its elements are in index.html
const getElement = (id: string) => document.getElementById(id);
const menu = getElement('menu'); // The whole menu
const getMenuVisibility = () => menu?.style.visibility !== 'hidden'; // whether the menu is visible or not

function setMenuVisibility(isVisible: boolean) {
    menu!.style.visibility = isVisible ? 'visible' : 'hidden';
    setInputPreventDefault(!isVisible); // don't prevent default when menu is visible
}

function gameInit() {
    getElement('button_test')!.onclick = function () {
        alert('Button was clicked!');
    }
    getElement('button_exitMenu')!.onclick = function () {
        setMenuVisibility(false);
    }
    getElement('input_test')!.onchange = function () {
        // @ts-ignore
        alert('New text: ' + this.value);
    }
    getElement('input_rangeTest')!.onchange = function () {
        // @ts-ignore
        alert('New value: ' + this.value);
    }
    setCanvasClearColor(hsl(0, 0, 0.2));

    // show menu for demo
    setMenuVisibility(true);
}


function gameUpdate() {
    // play sound when mouse is pressed
    if (mouseWasPressed(0)) {
        clickSound.play(mousePos);
    }
}

function gameUpdatePost() {
    // open menu visibility
    if (keyWasPressed('KeyM')) {
        setMenuVisibility(true);
    }

    // pause game when menu is visible
    setPaused(getMenuVisibility());
}

function gameRender() {
    // test game rendering
    for (let i = 0; i < 1e3; ++i) {
        const position = vec2(30 * sin(i + time / 9), 20 * sin(i * i + time / 9));
        drawTile(position, vec2(2), tile(3, 128), hsl(i / 9, 1, .4), time + i, !(i % 2), hsl(i / 9, 1, .1, 0));
    }
}

function gameRenderPost() {
    drawTextScreen('LittleJS HTML Menu Example\nM = Open menu',
        vec2(mainCanvasSize.x / 2, 70), 60,
        hsl(0, 0, 1), 6, hsl(0, 0, 0));
}

// Starting up the engine
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, ['tiles.png']);