/**
 * Player
 *     - Extends character class
 *     - Uses character physics system
 *     - Player can jump, shoot, roll, and throw grenades
 *     - Supports keyboard, mouse, and gamepad controls
 *     - Keeps track of player deaths
 */
import {
    gamepadIsDown,
    gamepadStick,
    isUsingGamepad,
    keyDirection,
    keyIsDown,
    mouseIsDown,
    Vector2
} from "littlejsengine";
import {addToDeaths} from "./game.ts";
import {Character} from "./gameCharacter.ts";

export class Player extends Character {
    moveInput: Vector2 = new Vector2(0, 0);
    holdingJump: boolean = false;
    holdingShoot: boolean = false;
    pressingThrow: boolean = false;
    pressedDodge: boolean = false;

    /**
     * We're going to use this function for controlling the movement of the player.
     */
    override update() {
        const mouseMode = !isUsingGamepad;
        this.moveInput = isUsingGamepad ? gamepadStick(0) : keyDirection();
        this.holdingJump = keyIsDown('ArrowUp') || gamepadIsDown(0);
        this.holdingShoot = mouseMode && mouseIsDown(0) || keyIsDown('KeyZ') || gamepadIsDown(2);
        this.pressingThrow = mouseMode && mouseIsDown(1) || keyIsDown('KeyC') || gamepadIsDown(1);
        this.pressedDodge = mouseMode && mouseIsDown(2) || keyIsDown('KeyX') || gamepadIsDown(3);
        super.update();
    }

    override kill(damagingObject: any) {
        this.isDead() || addToDeaths(); // a death counted once
        super.kill(damagingObject); // fall away from what killed the player
    }
}