import { useEffect } from 'react'

/**
 * Gives phone participants a portrait-shaped tile in the ZEGOCLOUD grid.
 *
 * Members join from the Flutter app, which is locked to portrait and publishes
 * a 9:16 stream. The UIKit's grid sizes every tile to the same landscape box,
 * so a portrait member arrives either cropped down to a letterbox slice or
 * marooned between two black pillars. Neither is much use to an admin who is
 * watching to see whether the member is doing the movement correctly.
 *
 * ## Division of labour
 *
 * This hook only *observes and labels*: it reads each `<video>`'s intrinsic
 * dimensions and stamps a `--zg-ar` custom property plus `data-zg-ar` /
 * `data-zg-grid` attributes onto the UIKit's tile element. All geometry lives
 * in the matching CSS block in `app/globals.css`. Nothing here sets a width, a
 * height, or a layout — so a mistake here cannot wedge the call's layout.
 *
 * ## Why it is safe to run against a third-party DOM
 *
 * Every UIKit class name is a CSS-modules build hash (`.Xfk1RtGH65gHx0iQ5uPA`
 * and friends) that changes on any package bump, so none are referenced. The
 * one structural fact relied on is that the UIKit gives the div wrapping each
 * video an `id` equal to the Zego stream id, `${roomID}_${userID}_${channel}` —
 * derived from our own room and user data rather than from a build artifact.
 *
 * If that ever stops holding, `closest()` returns null, nothing is stamped, no
 * CSS rule matches, and every tile renders exactly as it does today. The same
 * is true of the layout probe: tiles outside a row-flex grid (the sidebar
 * strip, a pinned "big video") are deliberately left alone.
 */
export function usePortraitTiles(container: HTMLElement | null) {
  useEffect(() => {
    if (!container) return

    // Ratios within ~5% of square are left unlabelled — reshaping a near-square
    // tile buys nothing and only risks fighting the grid's own sizing.
    const PORTRAIT_MAX_RATIO = 0.95
    const LANDSCAPE_MIN_RATIO = 1.05

    const tracked = new Map<HTMLVideoElement, () => void>()
    let frame: number | null = null
    let disposed = false

    /// The UIKit renders `<div id={streamID}>` per participant and lets the
    /// express engine append the `<video>` beneath it. `_screensharing` streams
    /// are excluded: a shared screen is landscape by nature and belongs in the
    /// grid's normal box.
    const resolveTile = (video: HTMLVideoElement): HTMLElement | null => {
      const box = video.closest('div[id$="_main"]')
      const tile = box?.parentElement
      return tile instanceof HTMLElement ? tile : null
    }

    /// True only for the wrapping row-flex grid. The sidebar strip lays its
    /// tiles out in a column and the pinned view is a plain block, and neither
    /// should be reshaped.
    const isRowFlexGrid = (tile: HTMLElement): boolean => {
      const parent = tile.parentElement
      if (!parent) return false
      const style = getComputedStyle(parent)
      return style.display === 'flex' && style.flexDirection === 'row'
    }

    const clearTile = (tile: HTMLElement) => {
      tile.style.removeProperty('--zg-ar')
      tile.removeAttribute('data-zg-ar')
      tile.removeAttribute('data-zg-grid')
    }

    const applyTo = (video: HTMLVideoElement) => {
      const tile = resolveTile(video)
      if (!tile) return

      const { videoWidth, videoHeight } = video
      if (!videoWidth || !videoHeight) return // metadata not in yet

      if (!isRowFlexGrid(tile)) {
        clearTile(tile)
        return
      }

      const ratio = videoWidth / videoHeight
      tile.style.setProperty('--zg-ar', String(ratio))
      tile.setAttribute(
        'data-zg-ar',
        ratio < PORTRAIT_MAX_RATIO
          ? 'portrait'
          : ratio > LANDSCAPE_MIN_RATIO
            ? 'landscape'
            : 'square',
      )
      tile.setAttribute('data-zg-grid', '')
    }

    const track = (video: HTMLVideoElement) => {
      if (tracked.has(video)) return

      const onChange = () => applyTo(video)
      // `resize` fires whenever the intrinsic dimensions change — the member
      // rotating their phone, or Zego's traffic control stepping the
      // resolution down — so the tile follows the stream rather than being
      // decided once at join.
      video.addEventListener('resize', onChange)
      video.addEventListener('loadedmetadata', onChange)
      tracked.set(video, () => {
        video.removeEventListener('resize', onChange)
        video.removeEventListener('loadedmetadata', onChange)
      })

      applyTo(video)
    }

    const scan = () => {
      if (disposed) return
      try {
        const live = new Set<HTMLVideoElement>()
        container.querySelectorAll('video').forEach((node) => {
          const video = node as HTMLVideoElement
          live.add(video)
          track(video)
        })

        // Drop participants who left, so a rejoin re-measures from scratch.
        tracked.forEach((untrack, video) => {
          if (live.has(video)) return
          untrack()
          tracked.delete(video)
        })
      } catch {
        // The UIKit owns this subtree; a surprise in it must never throw into
        // React and take the whole call down with it.
      }
    }

    const scheduleScan = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(() => {
        frame = null
        scan()
      })
    }

    const observer = new MutationObserver(scheduleScan)
    observer.observe(container, { childList: true, subtree: true })
    window.addEventListener('resize', scheduleScan)
    scan()

    return () => {
      disposed = true
      observer.disconnect()
      window.removeEventListener('resize', scheduleScan)
      if (frame !== null) window.cancelAnimationFrame(frame)
      tracked.forEach((untrack, video) => {
        untrack()
        const tile = resolveTile(video)
        if (tile) clearTile(tile)
      })
      tracked.clear()
    }
  }, [container])
}
