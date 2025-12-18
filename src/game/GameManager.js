import Matter from 'matter-js';
import { BlockFactory } from './BlockFactory';
import { Renderer } from './Renderer';

export class GameManager {
    constructor() {
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;
        this.blockFactory = new BlockFactory();

        // Setup Canvas
        const container = document.getElementById('game-container');
        this.canvas = document.createElement('canvas');
        container.appendChild(this.canvas);

        this.renderer = new Renderer(this.engine, this.canvas);

        // Setup Runner
        this.runner = Matter.Runner.create();

        // Setup Ground
        this.createGround();
        this.setupGroundResize();

        // Setup Walls
        this.createWalls();

        // Setup Ceiling
        this.createCeiling();

        // Setup Mouse Interaction
        this.setupInteraction();

        // Setup Events
        this.setupEvents();

        // Bind UI
        this.bindUI();
    }

    createGround() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        // Align ground with the top of the UI layer (120px desktop, 80px mobile)
        let uiHeight = 120;
        if (window.innerWidth <= 800) uiHeight = 80;
        this.floorTop = height - uiHeight;
        const groundHeight = 20; // Make the ground thin

        // Remove previous ground if it exists
        if (this.ground) {
            Matter.Composite.remove(this.world, this.ground);
        }

        const ground = Matter.Bodies.rectangle(
            width / 2,
            this.floorTop + groundHeight / 2,
            width * 2,
            groundHeight,
            {
                isStatic: true,
                render: { fillStyle: getComputedStyle(document.body).getPropertyValue('--ground-color').trim() },
                label: 'Ground'
            }
        );

        this.ground = ground; // Keep reference
        Matter.Composite.add(this.world, ground);
    }

    setupGroundResize() {
        this.boundResizeHandler = () => {
            this.createGround();
        };
        window.addEventListener('resize', this.boundResizeHandler);
    }

    destroy() {
        // Cleanup resize listener
        if (this.boundResizeHandler) {
            window.removeEventListener('resize', this.boundResizeHandler);
        }

        // Cleanup Renderer
        if (this.renderer) {
            this.renderer.destroy();
        }

        // Cleanup Matter Engine
        if (this.runner) {
            Matter.Runner.stop(this.runner);
        }
        if (this.engine) {
            Matter.World.clear(this.engine.world);
            Matter.Engine.clear(this.engine);
        }

        // Remove canvas
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }

    createWalls() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const wallThickness = 100;

        // Left Wall
        const leftWall = Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 2, {
            isStatic: true,
            render: { visible: false }, // Invisible walls
            label: 'Wall'
        });

        // Right Wall
        const rightWall = Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, {
            isStatic: true,
            render: { visible: false },
            label: 'Wall'
        });

        Matter.Composite.add(this.world, [leftWall, rightWall]);
    }

    createCeiling() {
        const width = window.innerWidth;
        const wallThickness = 100;

        // Ceiling (just above the top of the screen)
        const ceiling = Matter.Bodies.rectangle(width / 2, -wallThickness / 2, width * 2, wallThickness, {
            isStatic: true,
            render: { visible: false },
            label: 'Ceiling'
        });

        Matter.Composite.add(this.world, ceiling);
    }

    setupEvents() {
        const ESCAPE_VELOCITY = 1; // Tunable threshold

        Matter.Events.on(this.engine, 'preSolve', (event) => {
            const pairs = event.pairs;

            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;

                // Check if one is a wall and the other is a block
                let wall, block;
                if (bodyA.label === 'Wall' && bodyB.label === 'Block') {
                    wall = bodyA;
                    block = bodyB;
                } else if (bodyB.label === 'Wall' && bodyA.label === 'Block') {
                    wall = bodyB;
                    block = bodyA;
                }

                if (wall && block) {
                    // Check velocity of block towards the wall
                    // Simple check: magnitude of velocity
                    // Or specifically x-velocity
                    if (Math.abs(block.velocity.x) > ESCAPE_VELOCITY) {
                        pair.isActive = false; // Disable collision
                    }
                }
            }
        });

        Matter.Events.on(this.engine, 'beforeUpdate', (event) => {
            const bodies = Matter.Composite.allBodies(this.world);
            const width = window.innerWidth;
            const height = window.innerHeight;

            for (let i = 0; i < bodies.length; i++) {
                const body = bodies[i];
                if (body.isStatic) continue;

                // Safety: clamp angular velocity to avoid excessive spinning
                const MAX_ANGULAR = 2.5; // rad/s -- tunable
                if (Math.abs(body.angularVelocity) > MAX_ANGULAR) {
                    Matter.Body.setAngularVelocity(body, Math.sign(body.angularVelocity) * MAX_ANGULAR);
                }

                // Safety: clamp linear velocity to sane bounds to prevent tunneling
                // Increased from 60 to 200 to prevent artificial "braking" / deceleration feel
                const MAX_LINEAR = 200; // px/s (per tick approx)
                const vx = body.velocity.x;
                const vy = body.velocity.y;
                const speed = Math.sqrt(vx * vx + vy * vy);
                if (speed > MAX_LINEAR) {
                    const scale = MAX_LINEAR / speed;
                    Matter.Body.setVelocity(body, { x: vx * scale, y: vy * scale });
                }

                // Force correction if a body has managed to get inside the floor area — push it above floor
                if (this.floorTop) {
                    const penetration = body.bounds.max.y - this.floorTop;
                    // Allow a tiny bit of slop (1px) before hard correcting, so we don't fight the physics engine continuously
                    if (penetration > 1) {
                        // Move body up by the penetration amount
                        Matter.Body.translate(body, { x: 0, y: -penetration });

                        // Dampen velocity to prevent energy accumulation, but don't freeze it completely
                        // Just kill vertical velocity if it's going down
                        if (body.velocity.y > 0) {
                            Matter.Body.setVelocity(body, { x: body.velocity.x, y: 0 });
                        }
                    }
                }

                // Remove if far off screen
                if (body.position.y > height + 200 ||
                    body.position.x < -200 ||
                    body.position.x > width + 200) {
                    Matter.Composite.remove(this.world, body);
                }
            }
        });
    }

    setupInteraction() {
        // Attach mouse to the container div instead of canvas to avoid High DPI scaling issues
        // The container is 1:1 with CSS pixels, whereas the canvas buffer is scaled by dpr.
        const container = document.getElementById('game-container');
        const mouse = Matter.Mouse.create(container);

        // Force 1:1 mapping just in case
        const updateMouse = () => {
            mouse.pixelRatio = 1;
            Matter.Mouse.setScale(mouse, { x: 1, y: 1 });
            Matter.Mouse.setOffset(mouse, { x: 0, y: 0 });
        };

        updateMouse();
        window.addEventListener('resize', updateMouse);

        const mouseConstraint = Matter.MouseConstraint.create(this.engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false
                }
            }
        });

        // Prevent dragging below the floor
        Matter.Events.on(mouseConstraint, 'mousemove', (event) => {
            const mousePosition = event.mouse.position;
            // Clamp Y position to be above the floor (minus a small buffer for the block size)
            // We want to stop the mouse cursor itself from going too deep,
            // but effectively we just want to clamp the constraint target.
            if (this.floorTop && mousePosition.y > this.floorTop) {
                mousePosition.y = this.floorTop;
            }
        });

        // State for fling mechanics
        let lastDragPos = { x: 0, y: 0 };
        let dragVelocity = { x: 0, y: 0 };

        // Track velocity every frame for smoother flinging
        Matter.Events.on(this.engine, 'afterUpdate', () => {
            if (!mouseConstraint.body) return;

            const mousePos = mouseConstraint.mouse.position;
            const body = mouseConstraint.body;

            // Replicate the clamping logic to get the true physical target position
            const halfHeight = (body.bounds.max.y - body.bounds.min.y) / 2 || 30;
            const maxY = this.floorTop ? (this.floorTop - halfHeight) : mousePos.y;
            const targetY = Math.min(mousePos.y, maxY);
            const currentPos = { x: mousePos.x, y: targetY };

            // Calculate velocity (px per tick)
            dragVelocity = {
                x: currentPos.x - lastDragPos.x,
                y: currentPos.y - lastDragPos.y
            };

            lastDragPos = currentPos;
        });

        // Drag lifecycle handlers to prevent clipping / tunneling when players drag blocks
        Matter.Events.on(mouseConstraint, 'startdrag', (event) => {
            const body = event.body;
            if (!body || body.label !== 'Block') return;

            body._wasStaticOnDrag = !!body.isStatic;
            // Make the block static while the user drags it so it won't get flung or tunnel
            Matter.Body.setStatic(body, true);
            Matter.Body.setVelocity(body, { x: 0, y: 0 });
            Matter.Body.setAngularVelocity(body, 0);

            // Reset tracking
            const mousePos = event.mouse.position;
            lastDragPos = { x: mousePos.x, y: mousePos.y };
            dragVelocity = { x: 0, y: 0 };
        });

        Matter.Events.on(mouseConstraint, 'mousemove', (event) => {
            // Keep the dragged body clamped above the floor and stable
            const dragged = mouseConstraint.body;
            if (!dragged || dragged.label !== 'Block') return;

            const mousePosition = event.mouse.position;
            // compute half height from body bounds
            const halfHeight = (dragged.bounds.max.y - dragged.bounds.min.y) / 2 || 30;
            const maxY = this.floorTop ? (this.floorTop - halfHeight) : mousePosition.y;

            const targetY = Math.min(mousePosition.y, maxY);
            Matter.Body.setPosition(dragged, { x: mousePosition.x, y: targetY });

            // Do NOT zero velocity here if we weren't static, but since we are static, it doesn't matter much.
            // However, ensuring 0 is good hygiene if it were dynamic. 
            // We do not setVelocity(0) here because we want to preserve the illusion of movement? 
            // Actually, because it is Static, setVelocity does nothing.
        });

        Matter.Events.on(mouseConstraint, 'enddrag', (event) => {
            const body = event.body;
            if (!body || body.label !== 'Block') return;

            // Restore static state
            Matter.Body.setStatic(body, !!body._wasStaticOnDrag ? true : false);

            // Apply Fling Velocity
            // We apply it *after* making it dynamic again.
            if (!body.isStatic) {
                Matter.Body.setVelocity(body, {
                    x: dragVelocity.x,
                    y: dragVelocity.y
                });
            } else {
                Matter.Body.setVelocity(body, { x: 0, y: 0 });
            }

            Matter.Body.setAngularVelocity(body, 0);

            // If the block is overlapping others or the floor after releasing, nudge it upward until clear
            let iterations = 0;
            while (iterations < 12) {
                const collisions = Matter.Query.collides(body, Matter.Composite.allBodies(this.world));
                const overlap = collisions.some(c => c.bodyA === body || c.bodyB === body);
                if (!overlap) break;
                Matter.Body.setPosition(body, { x: body.position.x, y: body.position.y - 6 });
                iterations++;
            }
        });

        Matter.Composite.add(this.world, mouseConstraint);
    }

    spawnBlock(type) {
        // Add a small horizontal jitter to avoid exactly stacking multiple new blocks
        // at the same center point — this reduces immediate contact impulses that
        // can push thin shapes (triangles) sideways.
        const baseX = window.innerWidth / 2;
        const jitter = (Math.random() - 0.5) * 24; // +/- 12px
        const x = baseX + jitter;
        // Determine UI height (matches ground logic)
        let uiHeight = 120;
        if (window.innerWidth <= 800) uiHeight = 80;
        const groundY = window.innerHeight - uiHeight;

        // Get block size for clamping
        let block, blockHeight = 60; // Default
        switch (type) {
            case 'square':
                block = this.blockFactory.createSquare(x, 100);
                blockHeight = 60 * this.blockFactory.getScaleFactor();
                break;
            case 'rectangle':
                block = this.blockFactory.createRectangle(x, 100);
                blockHeight = 40 * this.blockFactory.getScaleFactor();
                break;
            case 'arch':
            case 'triangle':
                block = this.blockFactory.createTriangle(x, 100);
                blockHeight = 60 * this.blockFactory.getScaleFactor();
                break;
        }

        // Clamp Y so block bottom is above ground
        if (block) {
            const minY = 20 + blockHeight / 2; // Don't spawn off top
            const maxY = groundY - blockHeight / 2;
            // Set block position
            Matter.Body.setPosition(block, { x, y: Math.max(minY, Math.min(100, maxY)) });
            Matter.Composite.add(this.world, block);

            // Ensure newly spawned block is not overlapping others (especially triangles) —
            // nudge it upward until it is collision-free or we've tried a few times.
            let tries = 0;
            while (tries < 10) {
                const collisions = Matter.Query.collides(block, Matter.Composite.allBodies(this.world));
                // If any collision involves the block and some other body (excluding itself), try nudging up
                const overlap = collisions.some(c => c.bodyA === block || c.bodyB === block);
                if (!overlap) break;

                // Nudge up by a small step to give it clear space
                Matter.Body.setPosition(block, { x: block.position.x + (tries % 2 === 0 ? 6 : -6), y: block.position.y - 8 });
                tries++;
            }
        }
    }

    clearBlocks() {
        const bodies = Matter.Composite.allBodies(this.world);
        const blocks = bodies.filter(body => body !== this.ground && body.label !== 'Mouse Constraint'); // MouseConstraint is a constraint, not a body usually, but check just in case.
        // Actually MouseConstraint adds a constraint, not a body. But we should filter out static ground.
        // Also, we labeled our blocks 'Block'.

        const blocksToRemove = bodies.filter(body => body.label === 'Block');
        Matter.Composite.remove(this.world, blocksToRemove);
    }

    bindUI() {
        const buttons = document.querySelectorAll('.spawn-btn');
        // Use pointer events (covers touch & mouse) and prevent default to avoid selection in iOS Safari
        buttons.forEach(btn => {
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const shape = btn.dataset.shape;
                this.spawnBlock(shape);
            }, { passive: false });
        });

        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.clearBlocks();
            }, { passive: false });
        }

        // Prevent default touch behaviors on the canvas to avoid scrolling/selection
        this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

        // bindUI now handles pointer events for the buttons and canvas. Drag-safety handlers
        // belong in setupInteraction where mouseConstraint exists.
    }

    start() {
        Matter.Runner.run(this.runner, this.engine);
        this.renderer.start();
    }
}
