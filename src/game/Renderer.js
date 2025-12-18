import Matter from 'matter-js';

export class Renderer {
    constructor(engine, canvas) {
        this.engine = engine;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.handleResize(); // Initialize size

        this.boundResizeHandler = () => this.handleResize();
        window.addEventListener('resize', this.boundResizeHandler);
    }

    handleResize() {
        const dpr = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Scale the canvas buffer
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;

        // Scale the display size
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        // Scale the context
        this.ctx.scale(dpr, dpr);
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.render();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    destroy() {
        this.stop();
        window.removeEventListener('resize', this.boundResizeHandler);
    }

    render() {
        if (!this.isRunning) return;

        // Clear canvas
        this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-color').trim() || '#e6edf3';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw ground (invisible in physics but visual here if we want, or just bottom of screen)
        // For now, let's assume the ground is just off-screen or at the bottom.

        // Draw bodies
        const bodies = Matter.Composite.allBodies(this.engine.world);

        this.ctx.beginPath();

        for (let i = 0; i < bodies.length; i += 1) {
            const body = bodies[i];
            if (body.render.visible === false) continue;

            // Handle compound bodies (like the Arch)
            const parts = body.parts.length > 1 ? body.parts : [body];

            for (let j = 0; j < parts.length; j++) {
                const part = parts[j];
                // Skip the main body in compound bodies if it's just a container (it usually has no vertices of its own that matter for rendering if parts exist, but Matter.js structure can be tricky. 
                // Usually body.parts[0] is the main body. If parts.length > 1, parts[1+] are the sub-parts.
                if (body.parts.length > 1 && j === 0) continue;

                const vertices = part.vertices;

                this.ctx.beginPath();
                this.ctx.moveTo(vertices[0].x, vertices[0].y);

                for (let k = 1; k < vertices.length; k += 1) {
                    this.ctx.lineTo(vertices[k].x, vertices[k].y);
                }

                this.ctx.lineTo(vertices[0].x, vertices[0].y);
                this.ctx.closePath();

                this.ctx.fillStyle = part.render.fillStyle || '#000';
                this.ctx.fill();

                // Removed stroke for cleaner look
            }
        }

        this.animationFrameId = requestAnimationFrame(() => this.render());
    }
}
