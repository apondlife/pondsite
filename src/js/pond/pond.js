import { Vec2, Rng, Quad } from "./core.js"

// -- tuning --
const Tuning = {
  Life: {
    Drag: 0.1,
    Velocity: {
      Mag: new Rng(1, 3),
      Rot: new Rng(0, 2 * Math.PI),
    },
    Agitation: {
      Pct: 0.001,
      Mag: new Rng(50, 200),
      Rot: new Rng(0, 2 * Math.PI),
      Dur: new Rng(0.1, 0.4),
    },
  },
  Water: {
    X: {
      Mag: 2,
      Dur: 8,
    },
  },
  Lily: {
    X: {
      Mag: 1,
      Dur: 10,
    },
    Y: {
      Mag: 1,
      Dur: 10,
    },
  },
}

// -- constants --
const K = {
  Path: "/",
  TimeStep: 1000 / 60,
  ToRadians: Math.PI / 180,
}

const Props = {
  X: "x",
  Y: "y",
}

const Css = {
  X: "--x",
  Y: "--y",
  W: "--w",
  L: "--l",
  R: "--r",
  A: "--a",
}

// -- entities --
class Sprite {
  constructor(
    /** @type {"block" | "row" | "point"} */
    type
  ) {
    this.type = type
  }
}

class Collider {
  static Temp = Quad()

  constructor(
    /** @type {"life" | "wall"} */
    tag,
    angle = 0,
    quad = Quad()
  ) {
    this.tag = tag
    this.angle = angle
    this.quad = quad
    this.dirty = true
    this.didHit = false
  }
}

class Transform {
  constructor(
    pos = new Vec2(),
    width = 0
  ) {
    this.pos = pos
    this.width = width
  }
}

class Rigidbody {
  constructor(
    velocity = new Vec2(),
    acceleration = new Vec2()
  ) {
    this.velocity = velocity
    this.acceleration = acceleration
  }
}

class Agent {
  constructor(
    duration = 0,
    acceleration = new Vec2()
  ) {
    this.duration = duration
    this.acceleration = acceleration
  }
}

class Anim {
  constructor(
    prop = "",
    delta = 0,
    initial = 0,
    duration = 0,
    elapsed = -1
  ) {
    this.prop = prop
    this.delta = delta
    this.initial = initial
    this.duration = duration
    this.elapsed = elapsed >= 0 ? elapsed : Math.random() * duration
  }
}

// -- props --
/** @type {number} */
let requestId = null

// the timestamp last frame
let timePrev = 0

// the accumulated delta
let timeRemaining = 0

// the number of entities
let numEntities = 0

/** @type {HTMLElement} */
let $pond = null

/** @type {HTMLElement} */
let $pondBody = null

/** @type {Map<string, number>} */
let idByLife = new Map()

// the size of the pond in pixels
const pondSize = new Vec2()

// the size of the pond body in pixels
const bodySize = new Vec2()

/** @type {Array<HTMLElement>} */
let elements = []

/** @type {Array<Sprite>} */
let sprites = []

/** @type {Array<Collider>} */
let colliders = []

/** @type {Array<Transform>} */
let transforms = []

/** @type {Array<Rigidbody>} */
let rigidbodies = []

/** @type {Array<Agent>} */
let agents = []

/** @type {Array<Array<Anim>>} */
let animations = []

// -- debugging --
let debug = {
  frames: -1,
  /**
   * @param {number} delta
   * @param {Collider[]} colliders
   */
  Render(delta, colliders) {
  }
}

// -- lifetime --
async function Init() {
  // debug = (await import("./debug.js")).debug
  Visit()
  document.addEventListener("visit:finished", Visit)
}

function Visit() {
  if (document.location.pathname == K.Path) {
    requestAnimationFrame(Start)
  } else {
    Reset()
  }
}

/**
 * @param {DOMHighResTimestamp} time
 **/
function Start(time) {
  timePrev = time

  // set elements
  $pond = document.getElementById("pond")
  $pondBody = document.getElementById("pond-body")

  // create entities
  const $pondLifes = $pond.getElementsByClassName("Life")
  for (const $pondLife of $pondLifes) {
    CreateOrReuseLife($pondLife)
  }

  const $pondBanks = $pond.getElementsByClassName("Bank")
  for (const $pondBank of $pondBanks) {
    for (const $child of $pondBank.children) {
      CreateWall($child)
    }
  }

  const $pondWaters = $pond.getElementsByClassName("Water")
  for (const $pondWater of $pondWaters) {
    for (const $child of $pondWater.children) {
      CreateWater($child)
    }
  }

  const $pondLilies = $pond.getElementsByClassName("Lily")
  for (const $pondLily of $pondLilies) {
    CreateLily($pondLily)
  }

  // bind events
  window.addEventListener("resize", OnResize)

  // start update loop
  requestId = requestAnimationFrame(Update)
}

function Reset() {
  if (requestId == null) {
    return
  }

  // reset entities
  numEntities = idByLife.size
  elements = []
  sprites = sprites.slice(numEntities)
  colliders = colliders.slice(numEntities)
  transforms = transforms.slice(numEntities)
  rigidbodies = rigidbodies.slice(numEntities)
  agents = agents.slice(numEntities)
  animations = animations.slice(numEntities)

  // remove events
  window.removeEventListener("resize", OnResize)

  // stop update loop
  cancelAnimationFrame(requestId)
  requestId = null
}

// -- factories --
/**
 * @param {HTMLElement} $el
 **/
function CreateOrReuseLife($el) {
  const id = idByLife.get($el.id)

  // reuse cached life components, unless this is first load
  if (id == null) {
    CreateLife($el)
  } else {
    elements[id] = $el
  }
}

/**
 * @param {HTMLElement} $el
 **/
function CreateLife($el) {
  const tuning = Tuning.Life

  numEntities += 1

  // update the element
  elements.push($el)

  sprites.push(new Sprite(
    "point"
  ))

  colliders.push(new Collider(
    "life",
    GetStyle_Float(getComputedStyle($el), Css.A) * K.ToRadians
  ))

  transforms.push(new Transform(
    new Vec2(
      GetStyle_Float($el.style, Css.X),
      GetStyle_Float($el.style, Css.Y)
    )
  ))

  const v0 = new Vec2().Circular(
    tuning.Velocity.Mag.Sample(),
    tuning.Velocity.Rot.Sample()
  )

  rigidbodies.push(new Rigidbody(v0))

  agents.push(new Agent())

  animations.push(null)
}

/**
* @param {HTMLElement} $el
**/
function CreateWall($el) {
  numEntities += 1

  elements.push($el)

  sprites.push(null)

  colliders.push(new Collider(
    "wall",
    GetStyle_Float($el.style, Css.A) * K.ToRadians
  ))

  transforms.push(null)

  rigidbodies.push(null)

  agents.push(null)

  animations.push(null)
}

/**
 * @param {HTMLElement} $el
 **/
function CreateWater($el) {
  const tuning = Tuning.Water

  numEntities += 1

  elements.push($el)

  sprites.push(new Sprite(
    "row"
  ))

  colliders.push(null)

  const l = GetStyle_Float($el.style, Css.L)
  const r = GetStyle_Float($el.style, Css.R)

  transforms.push(new Transform(
    new Vec2(l, null),
    100 - r - l,
  ))

  rigidbodies.push(null)

  agents.push(null)

  animations.push([
    new Anim(Props.X, tuning.X.Mag, l, tuning.X.Dur * 1000)
  ])
}

/**
 * @param {HTMLElement} $el
 **/
function CreateLily($el) {
  const tuning = Tuning.Lily

  numEntities += 1

  elements.push($el)

  sprites.push(new Sprite(
    "point"
  ))

  colliders.push(null)

  const x = GetStyle_Float($el.style, Css.X)
  const y = GetStyle_Float($el.style, Css.Y)

  transforms.push(new Transform(
    new Vec2(x, y)
  ))

  rigidbodies.push(null)

  agents.push(null)

  animations.push([
    new Anim(Props.X, tuning.X.Mag, x, tuning.X.Dur * 1000),
    new Anim(Props.Y, tuning.Y.Mag, y, tuning.Y.Dur * 1000),
  ])
}

// -- systems --
/**
 * @param {DOMHighResTimestamp} time
 **/
function Update(time) {
  // update time
  const delta = time - timePrev
  timeRemaining += delta
  timePrev = time

  // run variable timestep systems
  SyncViewport(delta)

  // run fixed timestep systems
  const fixedDelta = K.TimeStep
  while (timeRemaining > fixedDelta && debug.frames != 0) {
    FixedUpdate(fixedDelta)
    timeRemaining -= fixedDelta
    debug.frames -= 1
  }

  // run render systems
  Render(fixedDelta)

  // schedule next frame
  requestId = requestAnimationFrame(Update)
}

/**
 * @param {number} delta
 **/
function FixedUpdate(delta) {
  Act(delta)
  SyncQuads(delta)
  Simulate(delta)
  Collide(delta)
  Animate(delta)
}

/**
 * @param {number} delta
 **/
function SyncViewport(delta) {
  const pondRect = $pond.getBoundingClientRect()
  pondSize.x = pondRect.width
  pondSize.y = pondRect.height

  const bodyRect = $pondBody.getBoundingClientRect()
  bodySize.x = bodyRect.width
  bodySize.y = bodyRect.height
}

/**
 * @param {number} delta
 **/
function Act(delta) {
  const tuning = Tuning.Life.Agitation

  // for every agent
  for (let id = 0; id < numEntities; id++) {
    const a = agents[id]
    const r = rigidbodies[id]
    if (a == null || r == null) {
      continue
    }

    // if this hit something last frame, cancel current acceleration
    const c = colliders[id]
    if (c != null && c.didHit) {
      a.duration = 0
    }

    // if there is an an active acceleration, apply it
    if (a.duration > 0) {
      a.duration = Math.max(a.duration - delta, 0)
      r.acceleration.Add(a.acceleration)
    }
    // otherwise, randomly select a new one
    else if (Math.random() < tuning.Pct) {
      a.duration = tuning.Dur.Sample() * 1000

      a.acceleration.Circular(
        tuning.Mag.Sample(),
        tuning.Rot.Sample()
      )
    }
  }
}

/**
 * @param {number} delta
 **/
function SyncQuads(delta) {
  // for all dirty colliders
  for (let id = 0; id < numEntities; id++) {
    const c = colliders[id]
    if (c == null || !c.dirty) {
      continue
    }

    const $el = elements[id]
    if ($el == null) {
      continue
    }

    // find the unrotated width / height
    const w = $el.offsetWidth
    const w2 = w / 2

    const h = $el.offsetHeight
    const h2 = h / 2

    // find the object center
    let cx = w2
    let cy = h2

    /** @type {HTMLElement} */
    let $tree = $el
    while ($tree != null) {
      cx += $tree.offsetLeft
      cy += $tree.offsetTop

      $tree = $tree.offsetParent
    }

    // rotate the rect to cache the quad
    const aCos = Math.cos(c.angle)
    const aSin = Math.sin(c.angle)

    const xCos = w2 * aCos
    const xSin = w2 * aSin
    const yCos = h2 * aCos
    const ySin = h2 * aSin

    c.quad[0].x = cx + -xCos - -ySin
    c.quad[0].y = cy + -xSin + -yCos

    c.quad[1].x = cx + +xCos - -ySin
    c.quad[1].y = cy + +xSin + -yCos

    c.quad[2].x = cx + +xCos - +ySin
    c.quad[2].y = cy + +xSin + +yCos

    c.quad[3].x = cx + -xCos - +ySin
    c.quad[3].y = cy + -xSin + +yCos

    // flag the quad as synced (unless life)
    c.dirty = c.tag === "life"
  }
}

/**
 * @param {number} delta
 **/
function Simulate(delta) {
  const tuning = Tuning.Life

  // for all colliders
  for (let id = 0; id < numEntities; id++) {
    const c = colliders[id]
    if (c == null) {
      continue
    }

    // if it's not a life, don't simulate
    if (c.tag != "life") {
      continue
    }

    const t = transforms[id]
    const r = rigidbodies[id]
    if (t == null || r == null) {
      continue
    }

    // simulate physics
    const v = r.velocity
    const a = r.acceleration
    const k = delta / 1000

    // calculate drag opposing accelerated velocity
    const va = v.Temp(0).Add(a.Temp(1).Scl(k))
    const vaMag = va.SqrMag()
    const drag = va.Temp(1).Scl(1 / Math.sqrt(vaMag)).Scl(vaMag * tuning.Drag)
    const dvMag = drag.Temp(2).Scl(k).SqrMag()

    // if drag would overcome the final velocity, cancel velocity instead to avoid osscilation
    if (dvMag >= vaMag) {
      a.Zero().Add(v.Temp(2).Scl(-1 / k))
    }
    // otherwise, subtract drag from acceleration
    else {
      a.Sub(drag)
    }

    // resolve forces
    v.Add(a.Temp(1).Scl(k))
    a.Zero()

    // update positions
    t.pos.Add(v.Temp(0).Scl(k))
  }
}

/**
 * @param {number} delta
 **/
function Collide(delta) {
  // for all colliders
  for (let id = 0; id < numEntities; id++) {
    const c = colliders[id]
    if (c == null) {
      continue
    }

    // if it's not a life, don't collide
    if (c.tag != "life") {
      continue
    }

    const t = transforms[id]
    if (t == null) {
      continue
    }

    // reset collision state
    c.didHit = false

    // for every wall
    for (let iid = 0; iid < numEntities; iid++) {
      const wall = colliders[iid]
      if (wall == null || wall.tag != "wall") {
        continue
      }

      CollideQuad(id, t, c, wall.quad)
    }

    // also collide with screen edge
    const s = pondSize
    CollideQuad(id, t, c, Collide_MakeEdge(0, 0, s.x, 0))
    CollideQuad(id, t, c, Collide_MakeEdge(s.x, 0, s.x, s.y))
    CollideQuad(id, t, c, Collide_MakeEdge(s.x, s.y, 0, s.y))
    CollideQuad(id, t, c, Collide_MakeEdge(0, s.y, 0, 0))
  }
}

/**
 * @param {number} id
 * @param {Transform} t
 * @param {Collider} c
 * @param {Vec2[]} b
 **/
function CollideQuad(id, t, c, b) {
  // check collisions using separating axis theorem; we'll call
  // - a: this quad
  // - b: the quad we're testing against
  const a = c.quad

  // the collision is a hit unless we find a separating axis
  let didHit = true
  let hitPoint = Vec2.Temp[0]
  let hitNormal = Vec2.Temp[1]
  let hitOffset = 0
  let hitOffsetMag = Number.MAX_VALUE

  // for each side of the the other quad
  for (let i0 = 0; i0 < 4 && didHit; i0++) {
    const i1 = (i0 + 1) % 4

    // find the endpoints
    const p0 = b[i0]
    const p1 = b[i1]

    // find the normal
    const bN = Vec2.Temp[2]
    bN.x = p0.y - p1.y
    bN.y = p1.x - p0.x
    bN.Normalize()

    // find the minimum & maximum projection of each quad along the normal
    let aMin = Number.MAX_VALUE
    let aMax = -aMin
    let bMin = aMin
    let bMax = -aMin

    // ...by projecting each point on both quads onto the normal
    for (let j0 = 0; j0 < 4; j0++) {
      const aDotN = bN.Dot(a[j0])
      const bDotN = bN.Dot(b[j0])

      if (aDotN < aMin) {
        aMin = aDotN
      }

      if (aDotN > aMax) {
        aMax = aDotN
      }

      if (bDotN < bMin) {
        bMin = bDotN
      }

      if (bDotN > bMax) {
        bMax = bDotN
      }
    }

    // translate projections w/ the edge of this side (bMax) @ the origin (0)
    aMin -= bMax
    aMax -= bMax
    bMin -= bMax

    // (translate bMax last)
    bMax -= bMax

    // calculate offsets to project out of an overlap
    let lOffset = bMax - aMin
    if (lOffset < 0) {
      lOffset = Number.MAX_VALUE
    }

    let rOffset = bMin - aMax
    if (rOffset > 0) {
      rOffset = Number.MAX_VALUE
    }

    const lOffsetMag = Math.abs(lOffset)
    const rOffsetMag = Math.abs(rOffset)

    // choose the offset that would be the smallest overlap
    let minOffset = lOffset
    let minOffsetMag = lOffsetMag

    if (rOffsetMag < lOffsetMag) {
      minOffset = rOffset
      minOffsetMag = rOffsetMag
    }

    // the max overlap is the sum of the lengths of a and b. if the min offset is less than this, it's an
    // overlap. otherwise, this is a separating axis & it's a miss
    const aLen = aMax - aMin
    const bLen = bMax - bMin
    didHit = minOffsetMag < aLen + bLen

    // if this side hit, find the smallest overlap to project out of the collision
    if (didHit && minOffsetMag < hitOffsetMag) {
      hitNormal.Set(bN)
      hitOffset = minOffset
      hitOffsetMag = minOffsetMag

      // TODO: this is not accurate, only using it for debugging
      hitPoint.Set(p1).Sub(p0).Scl(0.5).Add(p0)
    }
  }

  // if this hit
  if (didHit && hitOffsetMag !== 0) {
    c.didHit = true

    // project out of the collision
    const offset = hitNormal.Temp(3).Scl(hitOffset).Div(bodySize).Scl(100)
    t.pos.Add(offset)

    // if this has physics, cancel the velocity in the normal direction
    const r = rigidbodies[id]
    if (r != null) {
      r.velocity.Sub(hitNormal.Temp(3).Project(r.velocity))
    }
  }
}

/**
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 **/
function Collide_MakeEdge(x0, y0, x1, y1) {
  const quad = Collider.Temp

  // create the edge
  quad[0].x = x0
  quad[0].y = y0
  quad[1].x = x1
  quad[1].y = y1

  // duplicate the edge on the back two points
  quad[2].x = x0
  quad[2].y = y0
  quad[3].x = x1
  quad[3].y = y1

  return quad
}

/**
 * @param {number} delta
 **/
function Animate(delta) {
  // run animations
  for (let id = 0; id < numEntities; id++) {
    // advance animation
    const as = animations[id]
    if (as == null) {
      continue
    }

    for (const a of as) {
      a.elapsed = (a.elapsed + delta) % a.duration

      // make animation symmetric: [0..1] -> [0..1..0]
      let k = a.elapsed / a.duration
      k = (Math.sin(((2 * k) - 0.5) * Math.PI) / 2) + 0.5

      // update position
      const t = transforms[id]
      t.pos[a.prop] = a.initial + a.delta * k
    }
  }
}

/**
* @param {number} delta
**/
function Render(delta) {
  for (let id = 0; id < numEntities; id++) {
    const $el = elements[id]
    const s = sprites[id]
    const t = transforms[id]
    if (s == null || t == null) {
      continue
    }

    switch (s.type) {
    case "block":
    case "point":
      SetStyle_Percent($el, Css.X, t.pos.x)
      SetStyle_Percent($el, Css.Y, t.pos.y)
      break

    case "row":
      SetStyle_Percent($el, Css.L, t.pos.x)
      SetStyle_Percent($el, Css.R, 100 - t.width - t.pos.x)
      break
    }
  }

  debug.Render(delta, colliders)
}

// -- events --
function OnResize() {
  for (const c of colliders) {
    if (c != null) {
      c.dirty = true
    }
  }
}

// -- rendering --
/**
 * @param {CSSStyleDeclaration} styles
 * @param {string} name
 **/
function GetStyle_Float(styles, name) {
  const value = styles.getPropertyValue(name)
  if (value == null || value === "") {
    return 0
  }

  return Number.parseFloat(value)
}

/**
 * @param {HTMLElement} $el
 * @param {string} name
 * @param {number} value
 **/
function SetStyle_Percent($el, name, value) {
  $el.style.setProperty(name, `${value}%`)
}

// -- bootstrap --
Init()