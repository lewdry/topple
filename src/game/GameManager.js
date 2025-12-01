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

        // Setup Mouse Interaction
        this.setupInteraction();

        // Bind UI
        this.bindUI();
    }

    createGround() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        // Ground moved up to leave space for UI (UI is 120px, give 30px buffer)
        // We want the top of the floor to be at height - 150.
        const floorTop = height - 150;
        const groundHeight = 100;

        const ground = Matter.Bodies.rectangle(width / 2, floorTop + groundHeight / 2, width * 2, groundHeight, {
            isStatic: true,
            render: { fillStyle: '#2c3e50' }
        });

        this.ground = ground; // Keep reference
        Matter.Composite.add(this.world, ground);
    }

    setupInteraction() {
        const mouse = Matter.Mouse.create(this.canvas);
        const mouseConstraint = Matter.MouseConstraint.create(this.engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false
                }
            }
        });

        Matter.Composite.add(this.world, mouseConstraint);

        // Keep the mouse in sync with rendering
        // Matter.js Mouse needs pixel ratio adjustment if not handled, but usually okay with default renderer.
        // Since we are using custom renderer, we just need to make sure we pass the mouse to it if needed, 
        // but Matter.Mouse attaches event listeners to the element.
    }

    spawnBlock(type) {
        const x = window.innerWidth / 2;
        const y = 100; // Spawn near top

        let block;
        switch (type) {
            case 'square':
                block = this.blockFactory.createSquare(x, y);
                break;
            case 'rectangle':
                block = this.blockFactory.createRectangle(x, y);
                break;
            case 'arch': // Legacy support or if we kept it, but we are replacing with triangle
            case 'triangle':
                block = this.blockFactory.createTriangle(x, y);
                break;
        }

        if (block) {
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
