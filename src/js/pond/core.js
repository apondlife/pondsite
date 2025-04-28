// -- types --
export class Vec2 {
  // -- statics --
  static Temp = [
    new Vec2(),
    new Vec2(),
    new Vec2(),
    new Vec2(),
  ]

  // -- lifetime --
  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }

  // -- operators --
  Zero() {
    this.x = 0
    this.y = 0
    return this
  }

  Temp(tempIndex) {
    return Vec2.Temp[tempIndex].Set(this)
  }

  /**
   * @param {Vec2} other
   **/
  Set(other) {
    this.x = other.x
    this.y = other.y
    return this
  }

  /**
   * @param {Vec2} other
   **/
  Add(other) {
    this.x += other.x
    this.y += other.y
    return this
  }

  /**
   * @param {Vec2} other
   **/
  Sub(other) {
    this.x -= other.x
    this.y -= other.y
    return this
  }

  /**
   * @param {Vec2} other
   **/
  Div(other) {
    this.x /= other.x
    this.y /= other.y
    return this
  }

  /**
   * @param {number} scale
   **/
  Scl(scale) {
    this.x *= scale
    this.y *= scale
    return this
  }

  Normalize() {
    return this.Scl(1 / this.Mag())
  }

  /**
   * @param {Vec2} other
   **/
  Project(other) {
    return this.Scl(this.Dot(other))
  }

  /**
   * @param {number} len
   * @param {number} angle
   **/
  Circular(len, angle) {
    this.x = len * Math.cos(angle),
    this.y = len * Math.sin(angle)
    return this
  }

  // -- queries --
  Mag() {
    return Math.sqrt(this.SqrMag())
  }

  SqrMag() {
    const {x, y} = this
    return x * x + y * y
  }

  /**
   * @param {Vec2} other
   **/
  Dot(other) {
    return this.x * other.x + this.y * other.y
  }

  toString() {
    return `[${Fmt(this.x)}, ${Fmt(this.y)}]`
  }
}

export class Rng {
  /**
   * @param {number} min
   * @param {number} max
   **/
  constructor(min, max) {
    this.min = min
    this.max = max
  }

  // -- queries --
  Sample() {
    return Lerp(this.min, this.max, Math.random())
  }
}

// -- queries --
/**
 * @param {number} min
 * @param {number} max
 * @param {number} t
 **/
export function Lerp(min, max, t) {
  return min + (max - min) * t
}

export function Quad() {
  return [
    new Vec2(),
    new Vec2(),
    new Vec2(),
    new Vec2(),
  ]
}

/**
 * @param {number} num
 **/
export function Fmt(num) {
  return num.toFixed(4)
}
