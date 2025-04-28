import { Vec2 } from "./core.js"

// -- debug --
class Ray {
  constructor() {
    this.src = new Vec2()
    this.dir = new Vec2()
  }
}

class Debug {
  // -- types --
  Ray = Ray

  // -- lifetime --
  constructor() {
    this.$el = document.createElement("canvas")
    /** @type {Array<Ray>} */
    this.rays = []
  }

  // -- commands --
  Render(delta, colliders) {
    const $body = document.body

    const w = $body.clientWidth
    const h = $body.clientHeight

    this.$el.width = w
    this.$el.height = h

    const ctx = this.$el.getContext("2d")
    ctx.clearRect(0, 0, w, h)

    ctx.strokeStyle = "magenta"
    for (const c of colliders) {
      if (c == null) {
        continue
      }

      ctx.beginPath()

      const p0 = c.quad[0]
      ctx.moveTo(p0.x, p0.y)

      for (let i = 1; i < 4; i++) {
        const pi = c.quad[i]
        ctx.lineTo(pi.x, pi.y)
      }

      ctx.closePath()
      ctx.stroke()
    }

    ctx.fillStyle = "black"
    ctx.strokeStyle = "lime"
    for (const ray of this.rays) {
      const p0 = ray.src
      const p1 = ray.dir.Temp(0).Add(ray.src)

      ctx.beginPath()
      ctx.ellipse(p0.x, p0.y, 2, 2, 0, 0, 2 * Math.PI)
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.closePath()
      ctx.stroke()
    }
  }

  /**
   * @param {Vec2} src
   * @param {Vec2} dir
   */
  Draw(src, dir) {
    const ray = new Ray()
    ray.src.Set(src)
    ray.dir.Set(dir)

    this.rays.push(ray)
    this.rays[0].src
  }

  // -- events --
  /**
   * @param {KeyboardEvent} evt
   **/
  OnKeyDown(evt) {
    if (evt.key === " ") {
      if (numFrames < 0) {
        numFrames = 0
      } else {
        numFrames = 1
      }
    }
  }
}

// -- bootstrap --
function Insert() {
  const debug = new Debug()

  debug.$el.id = "debug"
  debug.$el.classList.toggle("Debug", true)
  document.body.appendChild(debug.$el)

  document.addEventListener("keydown", debug.OnKeyDown)

  return debug
}

// -- exports --
export const debug = Insert()