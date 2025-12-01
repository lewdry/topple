import Matter from 'matter-js';

export class BlockFactory {
  constructor() {
    this.palette = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#FFE66D', // Yellow
      '#FF9F1C', // Orange
      '#9B5DE5', // Purple
      '#3A86FF', // Bright Blue
      '#8AC926'  // Lime Green
    ];
  }

  getRandomColor() {
    return this.palette[Math.floor(Math.random() * this.palette.length)];
  }

  getScaleFactor() {
    // Scale based on screen width, capped to avoid huge blocks on desktop
    const refWidth = 600; // Reference width for "normal" size
    const scale = Math.min(window.innerWidth, 1000) / refWidth;
    return Math.max(scale, 0.85); // Don't get too small
  }

  createSquare(x, y) {
    const scale = this.getScaleFactor();
    const size = 60 * scale;
    return Matter.Bodies.rectangle(x, y, size, size, {
      chamfer: { radius: 4 * scale },
      render: { fillStyle: this.getRandomColor() },
      label: 'Block'
    });
  }

  createRectangle(x, y) {
    const scale = this.getScaleFactor();
    const width = 120 * scale;
    const height = 30 * scale;
    return Matter.Bodies.rectangle(x, y, width, height, {
      chamfer: { radius: 4 * scale },
      render: { fillStyle: this.getRandomColor() },
      label: 'Block'
    });
  }

  createTriangle(x, y) {
    const scale = this.getScaleFactor();
    // We want height to match square size (60 * scale)
    // For equilateral triangle, height = 3/2 * radius (where radius is distance from center to vertex)
    // So radius = height * 2/3
    const targetHeight = 60 * scale;
    const radius = targetHeight * (2 / 3);

    // Triangles can slide more aggressively because of point contacts.
    // Give triangles the same basic body options as other blocks but with a slightly higher
    // friction and a modest density to better match their physical behavior so they don't
    // push out sideways when added rapidly.
    return Matter.Bodies.polygon(x, y, 3, radius, {
      chamfer: { radius: 4 * scale },
      render: { fillStyle: this.getRandomColor() },
      label: 'Block',
      friction: 0.4,
      frictionStatic: 0.4,
      density: 0.0025
    });
  }
}
