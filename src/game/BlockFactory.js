import Matter from 'matter-js';

export class BlockFactory {
  constructor() {
    this.palette = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#FFE66D', // Yellow
      '#FF9F1C', // Orange
      '#9B5DE5', // Purple
      '#F15BB5'  // Pink
    ];
  }

  getRandomColor() {
    return this.palette[Math.floor(Math.random() * this.palette.length)];
  }

  getScaleFactor() {
    // Scale based on screen width, capped to avoid huge blocks on desktop
    const refWidth = 600; // Reference width for "normal" size
    const scale = Math.min(window.innerWidth, 1000) / refWidth;
    return Math.max(scale, 0.6); // Don't get too small
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
    const height = 40 * scale;
    return Matter.Bodies.rectangle(x, y, width, height, {
      chamfer: { radius: 4 * scale },
      render: { fillStyle: this.getRandomColor() },
      label: 'Block'
    });
  }

  createTriangle(x, y) {
    const scale = this.getScaleFactor();
    // We want height to match square size (60 * scale)
    // Height of equilateral triangle = side * sqrt(3) / 2
    // side = height * 2 / sqrt(3)
    const targetHeight = 60 * scale;
    const side = (targetHeight * 2) / Math.sqrt(3);

    return Matter.Bodies.polygon(x, y, 3, side, {
      chamfer: { radius: 4 * scale },
      render: { fillStyle: this.getRandomColor() },
      label: 'Block'
    });
  }
}
