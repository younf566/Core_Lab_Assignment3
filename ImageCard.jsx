import React from 'react'

export default function ImageCard({ img, idx, onDragStart, onDragEnter, className }) {
  return (
    <div
      className={className}
      draggable
      onDragStart={(e) => onDragStart(e, idx)}
      onDragEnter={(e) => onDragEnter(e, idx)}
    >
      <img src={img.src} alt={img.title} />
      <p>{img.title}</p>
    </div>
  )
}
  
