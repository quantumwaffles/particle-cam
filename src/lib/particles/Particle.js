export class Particle {
  constructor(x, y) {
    this.pos = { x, y };
    this.vel = { x: (Math.random() * 2 - 1), y: (Math.random() * 2 - 1) };
    this.acc = { x: 0, y: 0 };
    this.size = 1.5 + Math.random() * 1.5;
  }
  applyForceXY(fx, fy) {
    this.acc.x += fx;
    this.acc.y += fy;
  }
  update(config, width, height) {
    // integrate
    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;
    // clamp speed
    const ms2 = config.maxSpeed * config.maxSpeed;
    const sp2 = this.vel.x * this.vel.x + this.vel.y * this.vel.y;
    if (sp2 > ms2) {
      const s = config.maxSpeed / Math.sqrt(sp2);
      this.vel.x *= s; this.vel.y *= s;
    }
    // damping
    this.vel.x *= config.damping;
    this.vel.y *= config.damping;
    // position
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    // reset acc
    this.acc.x = 0; this.acc.y = 0;
    // edges: wrap or bounce
    if (config.wrapEdges !== false) {
      // wrap (default)
      if (this.pos.x < 0) this.pos.x += width;
      if (this.pos.x >= width) this.pos.x -= width;
      if (this.pos.y < 0) this.pos.y += height;
      if (this.pos.y >= height) this.pos.y -= height;
    } else {
      const bounceLoss = 0.6;
      if (this.pos.x < 0) { this.pos.x = 0; this.vel.x = Math.abs(this.vel.x) * bounceLoss; }
      if (this.pos.x > width) { this.pos.x = width; this.vel.x = -Math.abs(this.vel.x) * bounceLoss; }
      if (this.pos.y < 0) { this.pos.y = 0; this.vel.y = Math.abs(this.vel.y) * bounceLoss; }
      if (this.pos.y > height) { this.pos.y = height; this.vel.y = -Math.abs(this.vel.y) * bounceLoss; }
    }
  }
}
