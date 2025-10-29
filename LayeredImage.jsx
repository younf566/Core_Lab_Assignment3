import React, { useEffect, useRef, useState } from 'react'

// LayeredImage: takes a source image URL and produces four CMYK-like layers
// by processing the image on a canvas. Returns data URLs for each layer and
// renders them stacked. Also supports CSS transforms via props.

function createLayersFromImage(img) {
  const w = img.width
  const h = img.height

  // original canvas
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  const src = ctx.getImageData(0, 0, w, h)

  // helper to create imageData for a colored layer
  function makeLayer() {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const context = canvas.getContext('2d')
    const imgData = context.createImageData(w, h)
    return { canvas, context, imgData }
  }

  const cyan = makeLayer()
  const mag = makeLayer()
  const yel = makeLayer()
  const blk = makeLayer()

  // Process pixels once
  for (let i = 0; i < src.data.length; i += 4) {
    const r = src.data[i] / 255
    const g = src.data[i + 1] / 255
    const b = src.data[i + 2] / 255
    const a = src.data[i + 3] / 255

    // CMY are complements of RGB
    const cAlpha = (1 - r) * a
    const mAlpha = (1 - g) * a
    const yAlpha = (1 - b) * a

    // K (black) can be based on darkness (inverse luminance)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    const kAlpha = (1 - lum) * a

    const idx = i

    // Cyan: RGBA (0,255,255, cAlpha)
    cyan.imgData.data[idx] = 0
    cyan.imgData.data[idx + 1] = 255
    cyan.imgData.data[idx + 2] = 255
    cyan.imgData.data[idx + 3] = Math.round(cAlpha * 255)

    // Magenta: (255,0,255)
    mag.imgData.data[idx] = 255
    mag.imgData.data[idx + 1] = 0
    mag.imgData.data[idx + 2] = 255
    mag.imgData.data[idx + 3] = Math.round(mAlpha * 255)

    // Yellow: (255,255,0)
    yel.imgData.data[idx] = 255
    yel.imgData.data[idx + 1] = 255
    yel.imgData.data[idx + 2] = 0
    yel.imgData.data[idx + 3] = Math.round(yAlpha * 255)

    // Black: (0,0,0)
    blk.imgData.data[idx] = 0
    blk.imgData.data[idx + 1] = 0
    blk.imgData.data[idx + 2] = 0
    blk.imgData.data[idx + 3] = Math.round(kAlpha * 255)
  }

  // put imageData onto canvases
  cyan.context.putImageData(cyan.imgData, 0, 0)
  mag.context.putImageData(mag.imgData, 0, 0)
  yel.context.putImageData(yel.imgData, 0, 0)
  blk.context.putImageData(blk.imgData, 0, 0)

  return {
    cyan: cyan.canvas.toDataURL('image/png'),
    mag: mag.canvas.toDataURL('image/png'),
    yel: yel.canvas.toDataURL('image/png'),
    blk: blk.canvas.toDataURL('image/png'),
    width: w,
    height: h
  }
}

export default function LayeredImage({ src, transform = { x: 0, y: 0, rot: 0 }, name }) {
  const [layers, setLayers] = useState(null)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const result = createLayersFromImage(img)
      setLayers(result)
    }
    img.src = src
  }, [src])

  if (!layers) {
    return <div className="layered-placeholder">Loading {name || ''}...</div>
  }

  const style = {
    transform: `translate(${transform.x}px, ${transform.y}px) rotate(${transform.rot}deg)`,
    transformOrigin: 'center center'
  }

  // Stack order: cyan, magenta, yellow, black
  return (
    <div className="layered-image" style={{ width: layers.width, height: layers.height }}>
      <img src={layers.cyan} alt="cyan" className="c-layer" style={style} />
      <img src={layers.mag} alt="magenta" className="m-layer" style={style} />
      <img src={layers.yel} alt="yellow" className="y-layer" style={style} />
      <img src={layers.blk} alt="black" className="k-layer" style={style} />
    </div>
  )
}
