import React, { useState, useRef } from 'react'
import imagesData from './images.json'
import ImageCard from './ImageCard'
import parts from './parts.json'
import PartLayer from './PartLayer'
import MediaPipeTracker from './MediaPipeTracker'

export default function App() {
  const [images, setImages] = useState(imagesData)
  const [placed, setPlaced] = useState([])
  const [mediaPipeMode, setMediaPipeMode] = useState(false)
  const dragItem = useRef(null)
  const dragOverItem = useRef(null)
  const draggingRef = useRef(null)
  const canvasRef = useRef(null)

  // onDragStart: store the index of the dragged item (archive grid)
  function handleDragStart(e, position) {
    dragItem.current = position
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '')
  }

  function handleDragEnter(e, position) {
    dragOverItem.current = position
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  function handleDrop(e) {
    e.preventDefault()
    const from = dragItem.current
    const to = dragOverItem.current
    if (from === null || to === null || from === to) return

    setImages(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(from, 1)
      updated.splice(to, 0, moved)
      return updated
    })

    dragItem.current = null
    dragOverItem.current = null
  }

  // pointer dragging for placed layers
  function onPointerMove(e) {
    if (!draggingRef.current) return
    const d = draggingRef.current
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY

    if (d.mode === 'move') {
      setPlaced(prev => prev.map((p, i) => i === d.idx ? { ...p, transform: { ...(p.transform || {}), x: Math.round(d.origX + dx), y: Math.round(d.origY + dy), rot: p.transform?.rot || 0 } } : p))
    } else if (d.mode === 'rotate') {
      const newRot = Math.round(d.origRot + dx / 2)
      setPlaced(prev => prev.map((p, i) => i === d.idx ? { ...p, transform: { ...(p.transform || {}), x: p.transform?.x || 0, y: p.transform?.y || 0, rot: newRot } } : p))
    }
  }

  function onPointerUp() {
    window.removeEventListener('pointermove', onPointerMove)
    draggingRef.current = null
  }

  // sidebar drag - now includes color info
  function handlePartDragStart(e, key, color) {
    e.dataTransfer.setData('text/plain', JSON.stringify({ key, color }))
    e.dataTransfer.effectAllowed = 'copy'
  }

  // drop onto canvas
  function handleStudioDrop(e) {
    e.preventDefault()
    const data = JSON.parse(e.dataTransfer.getData('text/plain'))
    const { key, color } = data
    if (!key || !parts[key]) return
    // Use default position from parts.json if available
    const partDef = parts[key]
    const defaultX = partDef.posX !== undefined ? partDef.posX : 0
    const defaultY = partDef.posY !== undefined ? partDef.posY : 0
    const defaultRot = partDef.posRot !== undefined ? partDef.posRot : 0
    setPlaced(prev => [...prev, { id: `${key}-${color}-${Date.now()}`, part: key, color: color, imageUrl: parts[key][color], transform: { x: defaultX, y: defaultY, rot: defaultRot } }])
  }

  // MediaPipe face tracking callback with smoothing - EYES ONLY
  function handleFaceUpdate(faceData) {
    if (!mediaPipeMode || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const canvasRect = canvas.getBoundingClientRect()
    const smoothing = 0.3 // Lower = smoother but slower, higher = more responsive
    
    setPlaced(prev => {
      if (prev.length === 0) return prev
      
      return prev.map(layer => {
        let newTransform = { ...layer.transform }
        
        // Track eyes position
        if (layer.part === 'eyes' && faceData.eyes) {
          const targetX = (faceData.eyes.x - 0.5) * canvasRect.width
          const targetY = (faceData.eyes.y - 0.5) * canvasRect.height
          
          // Smooth interpolation (lerp)
          newTransform.x = newTransform.x + (targetX - newTransform.x) * smoothing
          newTransform.y = newTransform.y + (targetY - newTransform.y) * smoothing
        }
        
        // Ears are not tracked - they stay in their manually placed position
        // (MediaPipe ear detection is not reliable enough)
        
        return { ...layer, transform: newTransform }
      })
    })
  }

  // MediaPipe hand tracking callback with smoothing
  function handleHandsUpdate(hands) {
    if (!mediaPipeMode || !canvasRef.current) return
    if (hands.length === 0) return
    
    const canvas = canvasRef.current
    const canvasRect = canvas.getBoundingClientRect()
    const smoothing = 0.3 // Lower = smoother but slower, higher = more responsive
    
    setPlaced(prev => {
      if (prev.length === 0) return prev
      
      return prev.map(layer => {
        let newTransform = { ...layer.transform }
        
        hands.forEach((hand) => {
          let targetX = newTransform.x
          let targetY = newTransform.y
          
          if (layer.part === 'arm_left' && hand.handedness === 'Left') {
            targetX = (hand.center.x - 0.5) * canvasRect.width
            targetY = (hand.center.y - 0.5) * canvasRect.height
            // Smooth interpolation
            newTransform.x = newTransform.x + (targetX - newTransform.x) * smoothing
            newTransform.y = newTransform.y + (targetY - newTransform.y) * smoothing
          } else if (layer.part === 'arm_right' && hand.handedness === 'Right') {
            targetX = (hand.center.x - 0.5) * canvasRect.width
            targetY = (hand.center.y - 0.5) * canvasRect.height
            // Smooth interpolation
            newTransform.x = newTransform.x + (targetX - newTransform.x) * smoothing
            newTransform.y = newTransform.y + (targetY - newTransform.y) * smoothing
          }
        })
        
        return { ...layer, transform: newTransform }
      })
    })
  }

  return (
    <div className="app-root">
      <header>
        <h1>Interactive Archive</h1>
        <p className="subtitle">Rearrange your memories — drag cards to reorder them.</p>
      </header>

      <main>
        <section className="controls">
          <p>Drag an image and drop it on another to change the sequence. The app uses React <code>useState</code> for order.</p>
        </section>

        <section
          className="grid"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {images.map((img, idx) => (
            <ImageCard
              key={img.id}
              img={img}
              idx={idx}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              className={(() => { if (dragItem.current === idx) return 'card dragging'; if (dragOverItem.current === idx) return 'card drag-over'; return 'card' })()}
            />
          ))}
        </section>

        <section className="studio">
          <h2>Studio — CMYK Portrait Builder</h2>
          <p className="subtitle">Drag parts from the left into the black canvas. Click-drag to move, Shift+drag to rotate.</p>
          <div className="studio-area">
            <aside className="parts-sidebar">
              <button 
                onClick={() => setMediaPipeMode(!mediaPipeMode)}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginBottom: '12px',
                  background: mediaPipeMode ? '#0f0' : '#000',
                  color: mediaPipeMode ? '#000' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  fontSize: '10px'
                }}
              >
                {mediaPipeMode ? '🎥 TRACKING ON' : 'START MEDIAPIPE'}
              </button>
              {mediaPipeMode && (
                <div style={{ marginBottom: '12px' }}>
                  <MediaPipeTracker 
                    onFaceUpdate={handleFaceUpdate}
                    onHandsUpdate={handleHandsUpdate}
                  />
                </div>
              )}
              <h3>Parts</h3>
              <div className="parts-list">
                {Object.keys(parts).map((key) => (
                  <div key={key} style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase' }}>{parts[key].title}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {parts[key].c && <div className="part-item" draggable onDragStart={(e)=>handlePartDragStart(e, key, 'c')}><img src={parts[key].c} style={{ width: '100%', border: '1px solid #e0e0e0' }} alt="cyan" /></div>}
                      {parts[key].m && <div className="part-item" draggable onDragStart={(e)=>handlePartDragStart(e, key, 'm')}><img src={parts[key].m} style={{ width: '100%', border: '1px solid #e0e0e0' }} alt="magenta" /></div>}
                      {parts[key].y && <div className="part-item" draggable onDragStart={(e)=>handlePartDragStart(e, key, 'y')}><img src={parts[key].y} style={{ width: '100%', border: '1px solid #e0e0e0' }} alt="yellow" /></div>}
                      {parts[key].k && <div className="part-item" draggable onDragStart={(e)=>handlePartDragStart(e, key, 'k')}><img src={parts[key].k} style={{ width: '100%', border: '1px solid #e0e0e0' }} alt="black" /></div>}
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <div className="studio-canvas">
              <div ref={canvasRef} className="studio-stack" style={{ background: '#000' }} onDragOver={(e)=>e.preventDefault()} onDrop={handleStudioDrop}>
                {placed.map((layer, idx) => (
                  <div
                    key={layer.id}
                    className="studio-layer"
                    style={{
                      transform: `translate(-50%, -50%) translate(${layer.transform.x}px, ${layer.transform.y}px) rotate(${layer.transform.rot}deg)`
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      draggingRef.current = {
                        idx,
                        startX: e.clientX,
                        startY: e.clientY,
                        origX: layer.transform.x,
                        origY: layer.transform.y,
                        origRot: layer.transform.rot,
                        mode: e.shiftKey ? 'rotate' : 'move'
                      }
                      window.addEventListener('pointermove', onPointerMove)
                      window.addEventListener('pointerup', onPointerUp, { once: true })
                    }}
                  >
                    <img 
                      src={layer.imageUrl} 
                      alt={layer.color} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain', 
                        pointerEvents: 'none', 
                        opacity: 0.6,
                        transform: `scale(${layer.part === 'eyes' ? 0.3 : layer.part === 'lips' || layer.part === 'nose' ? 0.25 : layer.part === 'ears' ? 0.3 : layer.part === 'arm_left' || layer.part === 'arm_right' ? 0.6 : 1})`
                      }} 
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="studio-controls">
              <h3>Layers</h3>
              {placed.length === 0 && <div className="muted">No layers yet — drop parts into the canvas</div>}
              {placed.map((layer, idx) => (
                <div key={layer.id} className="layer-row">
                  <div className="layer-label">{parts[layer.part].title} ({layer.color.toUpperCase()})</div>
                  <div className="layer-actions">
                    <button onClick={() => setPlaced(prev => prev.filter((p,i)=>i!==idx))}>Remove</button>
                    <button onClick={() => setPlaced(prev => {
                      const copy = [...prev]
                      const [item] = copy.splice(idx,1)
                      copy.push(item)
                      return copy
                    })}>Send to back</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="notes">
          <h2>Design notes</h2>
          <ul>
            <li>Structure: grid of cards representing moments/memories.</li>
            <li>Interaction: drag parts from the left into the studio canvas to compose a CMYK portrait.</li>
            <li>Parts are color-separated PNGs (C/M/Y) and stacked with blend modes on a black background.</li>
          </ul>
        </section>
      </main>

      <footer>
        <small>Interactive Archive — demo assignment</small>
      </footer>
    </div>
  )
}
