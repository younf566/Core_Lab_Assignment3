import React from 'react'

// Renders existing color-separated PNGs as stacked layers with blend modes.
export default function PartLayer({ part }) {
  if (!part) return null

  return (
    <div className="part-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {part.c && <img src={part.c} alt="cyan" className="c-layer" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'contain' }} />}
      {part.m && <img src={part.m} alt="mag" className="m-layer" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'contain' }} />}
      {part.y && <img src={part.y} alt="yel" className="y-layer" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'contain' }} />}
      {part.k && <img src={part.k} alt="k" className="k-layer" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'contain' }} />}
    </div>
  )
}
