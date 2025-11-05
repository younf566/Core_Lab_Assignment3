import React, { useEffect, useRef, useState } from 'react'
import { FaceLandmarker, HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

export default function MediaPipeTracker({ onFaceUpdate, onHandsUpdate }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const faceLandmarkerRef = useRef(null)
  const handLandmarkerRef = useRef(null)

  useEffect(() => {
    let animationId
    
    async function initMediaPipe() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )

        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          outputFaceBlendshapes: false,
          runningMode: 'VIDEO',
          numFaces: 1
        })

        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 2
        })

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 } 
        })
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        setIsLoaded(true)
        predictLoop()
      } catch (error) {
        console.error('❌ MediaPipe initialization error:', error)
      }
    }

    function predictLoop() {
      if (!videoRef.current || videoRef.current.readyState !== 4) {
        animationId = requestAnimationFrame(predictLoop)
        return
      }
      
      if (!faceLandmarkerRef.current || !handLandmarkerRef.current) {
        animationId = requestAnimationFrame(predictLoop)
        return
      }

      try {
        const startTimeMs = performance.now()

        const faceResults = faceLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs)
        if (faceResults.faceLandmarks && faceResults.faceLandmarks[0]) {
          const landmarks = faceResults.faceLandmarks[0]
          
          const leftEye = { x: (landmarks[33].x + landmarks[133].x) / 2, y: (landmarks[33].y + landmarks[133].y) / 2 }
          const rightEye = { x: (landmarks[362].x + landmarks[263].x) / 2, y: (landmarks[362].y + landmarks[263].y) / 2 }
          const eyes = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 }

          const lips = { x: landmarks[13].x, y: landmarks[13].y }

          const nose = { x: landmarks[1].x, y: landmarks[1].y }

          const faceLeft = landmarks[234].x
          const faceRight = landmarks[454].x
          const earY = eyes.y
          
          const leftEar = { x: faceLeft - 0.05, y: earY }
          const rightEar = { x: faceRight + 0.05, y: earY }

          onFaceUpdate({ eyes, leftEye, rightEye, lips, nose, leftEar, rightEar })
        }

      
        const handResults = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs)
        if (handResults.landmarks && handResults.landmarks.length > 0) {
          const hands = handResults.landmarks.map((hand, idx) => ({
            landmarks: hand,
            handedness: handResults.handednesses[idx][0].categoryName,
            center: hand[9]
          }))
          onHandsUpdate(hands)
        }

        drawLandmarks(faceResults, handResults)
      } catch (error) {
        console.error('Prediction error:', error)
      }

      animationId = requestAnimationFrame(predictLoop)
    }

    function drawLandmarks(faceResults, handResults) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (faceResults.faceLandmarks && faceResults.faceLandmarks[0]) {
        ctx.fillStyle = 'cyan'
        faceResults.faceLandmarks[0].forEach(landmark => {
          ctx.beginPath()
          ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 2, 0, 2 * Math.PI)
          ctx.fill()
        })
      }

      if (handResults.landmarks) {
        ctx.fillStyle = 'magenta'
        handResults.landmarks.forEach(hand => {
          hand.forEach(landmark => {
            ctx.beginPath()
            ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 3, 0, 2 * Math.PI)
            ctx.fill()
          })
        })
      }
    }

    initMediaPipe().catch(console.error)

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop())
      }
    }
  }, [onFaceUpdate, onHandsUpdate])

  return (
    <div style={{ position: 'relative', width: '200px', height: '200px', marginLeft: 'auto', marginRight: 'auto' }}>
      <video 
        ref={videoRef} 
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', border: '2px solid #000', borderRadius: '4px' }}
        autoPlay 
        playsInline 
      />
      <canvas 
        ref={canvasRef} 
        width={640} 
        height={480}
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          transform: 'scaleX(-1)',
          pointerEvents: 'none',
          borderRadius: '4px'
        }}
      />
      {!isLoaded && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px', borderRadius: '4px', fontSize: '10px' }}>Loading...</div>}
    </div>
  )
}
