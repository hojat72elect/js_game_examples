/**
 * - Base GameObject class for objects with health.
 *     - `Crate` object collides with player, can be destroyed.
 *     - `Weapon` is held and fires bullets with some settings.
 *     - `Bullet` is the projectile launched by a weapon.
 */
import {
    ASSERT,
    cos,
    drawTile,
    EngineObject,
    engineObjectsCallback,
    hsl,
    lerp,
    max,
    min,
    ParticleEmitter,
    percent,
    PI,
    rand,
    randInt,
    setAdditiveBlendMode,
    sin,
    time,
    timeDelta,
    Timer,
    vec2
} from "littlejsengine";
import {addToScore, player, spriteAtlas} from "./game.ts";
import {
    destroyTile,
    explosion,
    makeDebris,
    persistentParticleDestroyCallback,
    sound_destroyObject,
    sound_grenade,
    sound_score,
    sound_shoot
} from "./gameEffects.ts";

export class GameObject extends EngineObject {

    health: number;
    isGameObject: number;
    damageTimer: any;

    constructor(pos: any, size: any, tileInfo: any, angle: any) {
        super(pos, size, tileInfo, angle);
        this.health = 0;
        this.isGameObject = 1;
        this.damageTimer = new Timer;
    }

    update() {
        // flash white when damaged
        let brightness = 0;
        if (!this.isDead() && this.damageTimer.isSet())
            brightness = .5 * percent(this.damageTimer, .15, 0);
        this.additiveColor = hsl(0, 0, brightness, 0);

        // kill if below level
        if (!this.isDead() && this.pos.y < -9)
            this.kill();
    }

    damage(damage: any, damagingObject: any) {
        ASSERT(damage >= 0);
        if (this.isDead())
            return 0;

        // set damage timer;
        this.damageTimer.set();
        for (const child of this.children)
            (child as GameObject).damageTimer && (child as GameObject).damageTimer.set();

        // apply damage and kill if necessary
        const newHealth = max(this.health - damage, 0);
        if (!newHealth)
            this.kill(damagingObject);

        // set new health and return amount damaged
        return this.health - (this.health = newHealth);
    }

    isDead() {
        return !this.health;
    }

    kill(_: any = undefined) {
        this.destroy();
    }
}

export class Crate extends GameObject {
    constructor(pos: any) {
        super(pos, vec2(0.999), spriteAtlas.crate, (randInt(4)) * PI / 2);

        this.color = hsl(rand(), 1, 0.8);
        this.health = 5;

        // make it a solid object for collision
        this.setCollision();
    }

    kill() {
        if (this.destroyed)
            return;

        sound_destroyObject.play(this.pos);
        makeDebris(this.pos, this.color, 30);
        this.destroy();
    }
}

export class Coin extends EngineObject {
    constructor(pos: any) {
        super(pos, vec2(1), spriteAtlas.coin);
        this.color = hsl(.15, 1, .5);
        this.mass = 0;
    }

    render() {
        // side of coin
        // @ts-ignore
        drawTile(this.pos, vec2(.1, .6), 0, this.color);

        // make it appear to spin
        const t = time + this.pos.x / 4 + this.pos.y / 4;
        const spinSize = vec2(.5 + .5 * sin(t * 2 * PI), 1);
        if (spinSize.x > .1)
            drawTile(this.pos, spinSize, this.tileInfo, this.color);
    }

    update() {
        if (!player)
            return;

        // check if player in range
        const d = this.pos.distanceSquared(player.pos);
        if (d > .5)
            return;

        // award points and destroy
        addToScore();
        sound_score.play(this.pos);
        this.destroy();
    }
}

export class Enemy extends GameObject {

    bounceTime: any;

    constructor(pos: any) {
        // @ts-ignore
        super(pos, vec2(.9, .9), spriteAtlas.enemy);

        this.drawSize = vec2(1);
        this.color = hsl(rand(), 1, .7);
        this.health = 5;
        this.bounceTime = new Timer(rand(1e3));
        this.setCollision(true, false);
    }

    update() {
        super.update();

        if (!player)
            return;

        // jump around randomly
        if (this.groundObject && rand() < .01 && this.pos.distance(player.pos) < 20)
            this.velocity = vec2(rand(.1, -.1), rand(.4, .2));

        // damage player if touching
        if (this.isOverlappingObject(player))
            player.damage(1, this);
    }

    kill() {
        if (this.destroyed)
            return;

        addToScore();
        sound_score.play(this.pos);
        makeDebris(this.pos, this.color);
        this.destroy();
    }

    render() {
        // bounce by changing size
        const bounceTime = this.bounceTime * 6;
        this.drawSize = vec2(1 - .1 * sin(bounceTime), 1 + .1 * sin(bounceTime));

        // make bottom flush
        let bodyPos = this.pos;
        bodyPos = bodyPos.add(vec2(0, (this.drawSize.y - this.size.y) / 2));
        drawTile(bodyPos, this.drawSize, this.tileInfo, this.color, this.angle, this.mirror, this.additiveColor);
    }
}

export class Grenade extends GameObject {

    beepTimer: Timer;

    constructor(pos: any) {
        // @ts-ignore
        super(pos, vec2(.2), spriteAtlas.grenade);

        this.beepTimer = new Timer(1);
        this.restitution = .3;
        this.friction = .9;
        this.angleDamping = .96;
        this.renderOrder = 1e8;
        this.setCollision(true, false);
    }

    update() {
        super.update();

        if (this.getAliveTime() > 3) {
            explosion(this.pos);
            this.destroy();
        } else if (this.beepTimer.elapsed()) {
            sound_grenade.play(this.pos)
            this.beepTimer.set(1);
        }
    }

    render() {
        drawTile(this.pos, vec2(.5), this.tileInfo, this.color, this.angle);

        // draw additive flash exploding
        setAdditiveBlendMode();
        const flash = cos(this.getAliveTime() * 2 * PI);
        drawTile(this.pos, vec2(2), spriteAtlas.circle, hsl(0, 1, .5, .2 - .2 * flash));
        setAdditiveBlendMode(false);
    }
}

export class Weapon extends EngineObject {

    fireRate: number;
    bulletSpeed: number;
    bulletSpread: number;
    damage: number;
    fireTimeBuffer;
    recoilTimer;
    shellEmitter: ParticleEmitter;
    triggerIsDown: any;

    constructor(pos: any) {
        super(pos, vec2(.6), spriteAtlas.gun);

        // weapon settings
        this.fireRate = 8;
        this.bulletSpeed = .5;
        this.bulletSpread = .1;
        this.damage = 1;

        // prepare to fire
        this.fireTimeBuffer = this.localAngle = 0;
        this.recoilTimer = new Timer;

        // shell effect
        // @ts-ignore
        this.addChild(this.shellEmitter = new ParticleEmitter(vec2(), 0, 0, 0, 0, .1, 0, hsl(.1, 1, .75), hsl(1 / 12, 2 / 3, .7), hsl(.1, 1, .75), hsl(1 / 12, 2 / 3, .7), 3, .1, .1, .15, .1, 1, .95, 1, 0, 0, .1, 1), vec2(.1, 0), -.8);
        this.shellEmitter.restitution = .5;
        this.shellEmitter.particleDestroyCallback = persistentParticleDestroyCallback;
    }

    update() {
        // update recoil
        if (this.recoilTimer.active())
            this.localAngle = lerp(this.localAngle, 0, this.recoilTimer.getPercent());

        this.mirror = this.parent!.mirror;
        this.fireTimeBuffer += timeDelta;
        if (this.triggerIsDown) {
            // try to fire
            for (; this.fireTimeBuffer > 0; this.fireTimeBuffer -= 1 / this.fireRate) {
                // create bullet
                sound_shoot.play(this.pos);
                this.localAngle = -rand(.2, .25);
                this.recoilTimer.set(.1);
                const direction = vec2(this.bulletSpeed * this.getMirrorSign(), 0);
                const velocity = direction.rotate(rand(-1, 1) * this.bulletSpread);
                const shootPos = this.pos.add(this.getRight().scale(.5 * this.getMirrorSign()));
                new Bullet(shootPos, this.parent, velocity, this.damage);

                // spawn shell particle
                this.shellEmitter.emitParticle();
            }
        } else
            this.fireTimeBuffer = min(this.fireTimeBuffer, 0);
    }
}

export class Bullet extends EngineObject {

    attacker;
    damage;
    range: number;

    constructor(pos: any, attacker: any, velocity: any, damage: any) {
        super(pos, vec2());
        this.color = hsl(1 / 6, 1, .5);
        this.velocity = velocity;
        this.attacker = attacker;
        this.damage = damage;
        this.damping = 1;
        this.gravityScale = 0;
        this.renderOrder = 100;
        this.drawSize = vec2(.2, .5);
        this.range = 5;
        // @ts-ignore
        this.setCollision(1, 0);
        this.isBullet = true; // moves along a ray, stops at the wall it hits
    }

    update() {
        // check if hit someone
        engineObjectsCallback(this.pos, this.size, (o) => {
            // @ts-ignore
            if (o.isGameObject)
                this.collideWithObject(o)
        });

        this.angle = this.velocity.angle();
        this.range -= this.getSpeed();
        if (this.range < 0) {
            // @ts-ignore
            new ParticleEmitter(this.pos, 0, .2, .1, 50, 3.14, spriteAtlas.circle, hsl(1 / 6, 1, .55), hsl(0, 0, 1), hsl(1 / 6, 1, .55, 0), hsl(0, 0, 1, 0), .1, .5, .1, .05, 0, 1, 1, .5, 3.14, .1, .5, 0, 1);

            this.destroy();
        }
    }

    collideWithObject(o: any) {
        // already hit something this frame, so it hits nothing else
        if (this.destroyed)
            return true;

        if (o.isGameObject && o != this.attacker) {
            o.damage(this.damage, this);
            o.applyForce(this.velocity.scale(.1));
        }

        this.kill();
        return true;
    }

    collideWithTile(data: any, pos: any) {
        if (data <= 0)
            return false;

        // a bullet is where it meets the wall, so the sparks start there
        destroyTile(pos);
        this.kill();
        return true;
    }

    kill() {
        if (this.destroyed)
            return;
        this.destroy();

        // spark effects
        // @ts-ignore
        const emitter = new ParticleEmitter(this.pos, 0, 0, .1, 100, .5, 0, hsl(1 / 6, 1, .5), hsl(0, 1, .5), hsl(1 / 6, 1, .5), hsl(0, 1, .5), .2, .2, 0, .1, .1, 1, 1, .5, 3.14, .1, .5, 1, 1);
        emitter.trailScale = 3;
        emitter.restitution = 0.3;
        emitter.angle = this.velocity.angle() + PI;
    }
}