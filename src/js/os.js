// -- constants --
const k = {
  /** the root page url's path, aka `url.pathname` */
  root: "/",
  /** a map of element ids */
  id: {
    Page: "page",
    Nav: "nav",
    Loading: "loading",
  },
  /** a map of class names */
  class: {
    isLoading: "is-loading",
  },
}

// -- types --
/** all visit types */
const Visit = {
  None: 0,
  SameOrigin: 1,
  SamePath: 2,
}

/** all history actions. passed through the anchor tag attributes as `data-history`. */
const HistoryAction = {
  /** push onto the history stack */
  Push: "push",

  /** replace the current entry on the history stack */
  Replace: "replace",

  /** replace the current entry on the history stack if this is the root page */
  ReplaceRoot: "replace-root",

  /** attempt to pop, if this was the previous page */
  Back: "back",
}

/** the os root class */
class Os {
  // -- props --
  /** the current location */
  url = null

  // -- p/el
  /** the page container */
  $page = null

  /** the nav */
  $nav = null

  /** the loading indicator */
  $loading = null

  // -- lifetime --
  /** create a new os */
  constructor() {
    const m = this

    // set props
    m.url = m.toUrl(document.location)
    m.$page = document.getElementById(k.id.Page)
    m.$nav = document.getElementById(k.id.Nav)
    m.$loading = document.getElementById(k.id.Loading)
  }

  // -- commands --
  /** boostrap the os. call this as soon as possible after site load. */
  start() {
    const m = this

    // bind events
    const d = document
    d.addEventListener("click", m.didClick)

    const w = window
    w.addEventListener("popstate", m.didPopState)

    // add initial history entry
    const currUrl = window.location.href
    m.replaceHistoryEntry(currUrl, {
      initial: true,
    })

    // run post visit events first time
    m.didFinishVisit()
  }

  /** navigate to a new url. records current state and pushes a new state. */
  navigate(nextUrl, historyAction) {
    const m = this

    const prevUrl = m.toUrl(history.state.prevUrl)
    const currUrl = m.toUrl(window.location.href)

    // if this is a navigtion back to the previous page, then go back
    if (historyAction == HistoryAction.Back && prevUrl?.href === nextUrl.href) {
      history.back()
      return
    }

    const isReplace =
      historyAction == HistoryAction.Replace ||
      (historyAction == HistoryAction.ReplaceRoot && m.isRoot(currUrl))

    // if this is a replace, replace the current entry
    if (isReplace) {
      m.replaceHistoryEntry(nextUrl)
    }
    // otherwise push history entry for the new url
    else {
      // update the current page's state
      const { initial: _, ...state } = history.state
      m.replaceHistoryEntry(currUrl, {
        ...state,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      })

      // push the next page onto the stack
      m.pushHistoryEntry(nextUrl, {
        prevUrl: currUrl.href,
      })
    }

    // visit page
    m.visit(nextUrl)
  }

  /** visit the url and update the game */
  async visit(url, prevState = null) {
    const m = this

    // run pre visit events
    m.didStartVisit()

    // update the browser url
    m.url = url

    // download the page
    const resp = await fetch(url)
    const text = await resp.text()

    // render the element
    const $el = document.createElement("html")
    $el.innerHTML = text

    // update the document title
    const $nextTitle = $el.querySelector("title")
    const $currTitle = document.head.querySelector("title")
    $currTitle.innerText = $nextTitle.innerText

    // extract the page
    const $next = $el.querySelector(`#${k.id.Page}`)

    // replace the page element's attributes
    for (const name of m.$page.getAttributeNames()) {
      m.$page.removeAttribute(name)
    }

    for (const name of $next.getAttributeNames()) {
      m.$page.setAttribute(name, $next.getAttribute(name))
    }

    // replace children of page element
    for (const child of Array.from(m.$page.childNodes)) {
      if (child != m.$nav) {
        m.$page.removeChild(child)
      }
    }

    let isNavFound = false
    for (const child of Array.from($next.children)) {
      if (child.id === k.id.Nav) {
        isNavFound = true
        continue
      }

      if (!isNavFound) {
        m.$page.insertBefore(child, m.$nav)
      } else {
        m.$page.appendChild(child)
      }
    }

    // get scroll anchor
    let $anchor = null

    const anchorId = document.location.hash.slice(1)
    if (anchorId != null && anchorId !== "") {
      $anchor = document.getElementById(anchorId)
    }

    // set scroll position. if we have a previous state, this is a "back" visit, so try to
    // restore previous scroll position.
    if (prevState != null) {
      window.scrollTo(prevState.scrollX ?? 0, prevState.scrollY ?? 0)
    }
    // on forward nav, if there is an anchor scroll to it
    else if ($anchor != null) {
      $anchor.scrollIntoView()
    }
    // otherwise, scroll to the origin
    else {
      window.scrollTo(0, 0)
    }

    // TODO: do we need this?
    // activate any inert script tags on the new page
    const scripts = m.$page.querySelectorAll("script")
    for (const inert of Array.from(scripts)) {
      // clone the inert script tag
      const script = document.createElement("script")
      script.textContent = inert.textContent
      for (const { name, value } of inert.attributes) {
        script.setAttribute(name, value)
      }

      // and replace it with the active one
      const parent = inert.parentElement
      parent.replaceChild(script, inert)
    }

    // run post visit events
    m.didFinishVisit()
  }

  /** add a url & state pair to history */
  pushHistoryEntry(url, state = {}) {
    history.pushState(state, "", url)
  }

  /** set a url & state pair in history */
  replaceHistoryEntry(url, state = {}) {
    history.replaceState(state, "", url)
  }

  /** toggle the loading ui */
  toggleLoading(isLoading) {
    this.$loading.classList.toggle(k.class.isLoading, isLoading)
  }

  // -- queries --
  /** get the visit type for a change to this url */
  getVisit(url) {
    const m = this

    // default to no visit, browser nav
    let type = Visit.None

    // if the origin matches
    if (m.url.origin === url.origin) {
      type = Visit.SameOrigin

      // if the path matches
      if (m.url.pathname === url.pathname) {
        type = Visit.SamePath
      }
    }

    return type
  }

  /** if is the root page's url */
  isRoot(url) {
    return url.pathname == k.root
  }

  /** convert url or string or location to a url with no trailing slash */
  toUrl(urlSource, base = undefined) {
    if (urlSource == null) {
      return null
    }

    const url = new URL(urlSource, base)
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1)
    }

    return url
  }

  // -- events --
  /** when anything is clicked on */
  didClick = (evt) => {
    const m = this

    // see if there is an enclosing link
    let $a = evt.target
    while ($a != null && $a.tagName.toLowerCase() !== "a") {
      $a = $a.parentElement
    }

    // if, we didn't find a link, ignore
    if ($a == null) {
      return
    }

    // if it has a target (like "_blank"), ignore
    if ($a.getAttribute("target")) {
      return
    }

    // grab its url (an svg link's href is an object)
    let href = $a.href
    if (typeof href === "object") {
      href = href.baseVal.toString()
    }

    // if it has no url, ignore
    if (!href) {
      return
    }

    // get the visit type
    const nextUrl = m.toUrl(href, m.url)
    const visit = m.getVisit(nextUrl)

    // if none, ignore
    if (visit === Visit.None) {
      return
    }

    // if some, cancel the click
    evt.preventDefault()

    // if not same path, run the navigation
    if (visit != Visit.SamePath) {
      m.navigate(nextUrl, $a.dataset.history)
    }
  }

  /** when back is clicked */
  didPopState = (evt) => {
    const m = this

    // get the visit for this url
    const prevUrl = new URL(document.location.href)
    const visit = m.getVisit(prevUrl)

    // if none, do what the browser wants
    if (visit === Visit.None) {
      return
    }

    // otherwise, visit the url
    m.visit(prevUrl, evt.state)
  }

  /** when a visit starts */
  didStartVisit() {
    this.toggleLoading(true)
    document.dispatchEvent(new CustomEvent("visit:started"))
  }

  /** when a visit finishes */
  didFinishVisit() {
    this.toggleLoading(false)
    document.dispatchEvent(new CustomEvent("visit:finished"))
  }
}

// -- singleton --
const os = new Os()
window.os = os

// -- bootstrap --
os.start()
