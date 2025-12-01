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
                render: { fillStyle: '#626161' },
                label: 'Ground'
            }
        );

        this.ground = ground; // Keep reference
        Matter.Composite.add(this.world, ground);
    }

    setupGroundResize() {
        window.addEventListener('resize', () => {
            this.createGround();
        });
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
        const ESCAPE_VELOCITY = 2; // Tunable threshold

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

        Matter.Composite.add(this.world, mouseConstraint);
    }

    spawnBlock(type) {
        const x = window.innerWidth / 2;
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
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const shape = btn.dataset.shape;
                this.spawnBlock(shape);
            });
        });

        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearBlocks();
            });
        }

        // Prevent default touch behaviors
        this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }

    start() {
        Matter.Runner.run(this.runner, this.engine);
        this.renderer.start();
    }
}
