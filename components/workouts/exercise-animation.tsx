'use client'

import { useEffect, useState } from 'react'

const FRAME_INTERVAL_MS = 600

export function ExerciseAnimation({
  urls,
  className,
}: {
  urls: string[]
  className?: string
}) {
  const [frame, setFrame] = useState(0)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    setFrame(0)
    setErrored(false)
  }, [urls.join('|')])

  useEffect(() => {
    if (urls.length < 2) return
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % urls.length)
    }, FRAME_INTERVAL_MS)
    return () => clearInterval(id)
  }, [urls.length])

  if (urls.length === 0 || errored) return null

  return (
    <div className={className}>
      <img
        src={urls[frame]}
        alt=""
        loading="eager"
        decoding="async"
        onError={() => setErrored(true)}
        className="w-full h-full object-cover"
      />
    </div>
  )
}
