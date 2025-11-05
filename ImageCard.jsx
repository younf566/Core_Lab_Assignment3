import React from 'react'

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
