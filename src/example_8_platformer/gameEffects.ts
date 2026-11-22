/*
    LittleJS Platformer Example - Effects
    - Plays different particle effects which can be persistent
    - Destroys terrain and makes explosions
    - Outlines tiles again where terrain is destroyed
    - Draws the sky, a gradient with stars
    - Tracks zzfx sound effects
*/
import {
    ASSERT,
    cameraPos,
    cameraShake,
    drawRect,
    drawRectGradient,
    EngineObject,
    engineObjectsCallback,
    getCameraSize,
    hsl,
    mainCanvasSize,
    ParticleEmitter,
    percent,
    randColor,
    randInt,
    RandomGenerator,
    setAdditiveBlendMode,
    Sound,
    time,
    vec2
} from "littlejsengine";
import {decorateTile, foregroundTileLayer, tileType_empty, tileType_solid} from "./gameLevel.ts";

// sound effects
export const sound_shoot = new Sound([undefined, undefined, 90, undefined, .01, .03, 4, undefined, undefined, undefined, undefined, undefined, undefined, 9, 50, .2, undefined, .2, .01]);
export const sound_destroyObject = new Sound([.5, undefined, 1e3, .02, undefined, .2, 1, 3, .1, undefined, undefined, undefined, undefined, 1, -30, .5, undefined, .5]);
export const sound_die = new Sound([.5, .4, 126, .05, undefined, .2, 1, 2.09, undefined, -4, undefined, undefined, 1, 1, 1, .4, .03]);
export const sound_jump = new Sound([.4, .2, 250, .04, undefined, .04, undefined, undefined, 1, undefined, undefined, undefined, undefined, 3]);
export const sound_dodge = new Sound([.4, .2, 150, .05, undefined, .05, undefined, undefined, -1, undefined, undefined, undefined, undefined, 4, undefined, undefined, undefined, undefined, .02]);
export const sound_walk = new Sound([.3, .1, 50, .005, undefined, .01, 4, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 10, undefined, undefined, .5]);
export const sound_explosion = new Sound([2, .2, 72, .01, .01, .2, 4, undefined, undefined, undefined, undefined, undefined, undefined, 1, undefined, .5, .1, .5, .02]);
export const sound_grenade = new Sound([.5, .01, 300, undefined, undefined, .02, 3, .22, undefined, undefined, -9, .2, undefined, undefined, undefined, undefined, undefined, .5]);
export const sound_score = new Sound([undefined, undefined, 783, undefined, .03, .02, 1, 2, undefined, undefined, 940, .03, undefined, undefined, undefined, undefined, .2, .6, undefined, .06]);

/**
 * special effects
 */
export const persistentParticleDestroyCallback = (particle: any) => {
    // draw particle to tile layer on death
    ASSERT(!particle.tileInfo, 'quick draw to tile layer uses canvas 2d so must be untextured');
    if (particle.groundObject) {
        foregroundTileLayer.drawTile(particle.pos, particle.size, particle.tileInfo, particle.color, particle.angle, particle.mirror);
    }
}

export function makeBlood(pos: any, amount: any) {
    makeDebris(pos, hsl(0, 1, .5), amount, .1, 0);
}

export function makeDebris(pos: any, color = hsl(), amount = 50, size = .2, restitution = .3) {
    const color2 = color.lerp(hsl(), .5);
    // @ts-ignore
    const emitter = new ParticleEmitter(pos, 0, .5, .1, amount / .1, 3.14, 0, color, color2, color, color2, 3, size, size, .1, .05, 1, .95, .4, 3.14, 0, .5, 1);
    emitter.restitution = restitution;
    emitter.particleDestroyCallback = persistentParticleDestroyCallback;
    return emitter;
}

export function explosion(pos: any, radius = 3) {
    ASSERT(radius > 0);

    sound_explosion.play(pos);
    cameraShake(radius / 10); // a bigger blast shakes more

    {
        // destroy level
        const layer = foregroundTileLayer;
        layer.redrawStart();
        for (let x = -radius; x < radius; ++x) {
            const h = (radius * radius - x * x) ** .5;
            for (let y = -h; y <= h; ++y)
                destroyTile(pos.add(vec2(x, y)), 0, 0);
        }
        // cleanup neighbors
        const cleanupRadius = radius + 2;
        for (let x = -cleanupRadius; x < cleanupRadius; ++x) {
            const h = (cleanupRadius ** 2 - x ** 2) ** .5;
            for (let y = -h; y < h; ++y)
                decorateTile(pos.add(vec2(x, y)).floor(), layer);
        }
        layer.redrawEnd();
    }

    // kill/push objects
    engineObjectsCallback(pos, radius * 6, (o: any) => {
        const damage = radius * 2;
        const d = o.pos.distance(pos);
        if (o.isGameObject) {
            // do damage
            d < radius && o.damage(damage);
        }

        // push
        const p = percent(d, 2 * radius, radius);
        const force = o.pos.subtract(pos).normalize(p * radius * .2);
        o.applyForce(force);
    });

    // smoke
    // @ts-ignore
    new ParticleEmitter(pos, 0, radius / 2, .2, 50 * radius, 3.14, 0, hsl(0, 0, 0), hsl(0, 0, 0), hsl(0, 0, 0, 0), hsl(0, 0, 0, 0), 1, .5, 2, .2, .05, .9, 1, -.3, 3.14, .1, .5, 0, 0, 0, 1e8);

    // fire
    // @ts-ignore
    new ParticleEmitter(pos, 0, radius / 2, .1, 100 * radius, 3.14, 0, hsl(.07, 1, .55), hsl(0, 1, .55), hsl(.07, 1, .55, 0), hsl(0, 1, .55, 0), .7, .8, .2, .2, .05, .9, 1, -.2, 3.14, .05, .5, 0, 1, 0, 1e9);
}

export function destroyTile(pos: any, makeSound = 1, cleanup = 1) {
    // pos must be an int
    pos = pos.floor();

    // destroy tile
    const layer = foregroundTileLayer;
    const tileType = layer.getCollisionData(pos);
    if (!tileType)
        return true;

    const centerPos = pos.add(vec2(.5));
    const layerData = layer.getData(pos);
    if (!layerData || tileType === tileType_solid)
        return false;

    // create effects
    makeDebris(centerPos, layerData.color.mutate());
    makeSound && sound_destroyObject.play(centerPos);

    // set and clear tile
    layer.clearData(pos, true);
    layer.setCollisionData(pos, tileType_empty);

    // cleanup neighbors and rebuild WebGL
    if (cleanup) {
        const layer = foregroundTileLayer;
        layer.redrawStart();
        for (let i = -1; i <= 1; ++i)
            for (let j = -1; j <= 1; ++j)
                decorateTile(pos.add(vec2(i, j)), layer);
        layer.redrawEnd();
    }

    return true;
}

// sky with background gradient and stars

export class Sky extends EngineObject {

    seed;
    skyColor;
    horizonColor;

    constructor() {
        super();
        this.renderOrder = -1e4;
        this.seed = randInt(1e9);
        this.skyColor = randColor(hsl(0, 0, .5), hsl(0, 0, .9));
        this.horizonColor = this.skyColor.subtract(hsl(0, 0, .05, 0)).mutate(.3);
    }

    render() {
        // fill background with a gradient
        drawRectGradient(cameraPos, getCameraSize(), this.skyColor, this.horizonColor);

        // draw stars
        setAdditiveBlendMode();
        const random = new RandomGenerator(this.seed);
        for (let i = 1e3; i--;) {
            const size = random.float(.5, 2) ** 2;
            const speed = random.float() < .9 ? random.float(5) : random.float(9, 99);
            const color = hsl(random.float(-.3, .2), random.float(), random.float());
            const extraSpace = 50;
            const w = mainCanvasSize.x + 2 * extraSpace;
            const h = mainCanvasSize.y + 2 * extraSpace;
            const screenPos = vec2(
                (random.float(w) + time * speed) % w - extraSpace,
                (random.float(h) + time * speed * random.float()) % h - extraSpace);
            drawRect(screenPos, vec2(size), color, 0, undefined, true)
        }
        setAdditiveBlendMode(false);
    }
}
