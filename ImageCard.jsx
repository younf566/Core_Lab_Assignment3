import React from 'react'

// ImageCard is a presentational component that receives data via props.
// It does not manage its own state — the parent controls behavior (drag, order).
export default function ImageCard({ img, idx, onDragStart, onDragEnter, className }) {
  return (
    <article
      key={img.id}
      draggable
      onDragStart={(e) => onDragStart(e, idx)}
      onDragEnter={(e) => onDragEnter(e, idx)}
      className={className}
    >
      <div className="image-wrap">
        <img src={img.url} alt={img.title} />
      </div>
      <div className="meta">
        <h3>{img.title}</h3>
        <small>Position: {idx + 1}</small>
      </div>
    </article>
  )
}
