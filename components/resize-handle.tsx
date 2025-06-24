"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"

interface ResizeHandleProps {
  direction: "horizontal" | "vertical"
  onResize: (delta: number) => void
  className?: string
}

export default function ResizeHandle({ direction, onResize, className = "" }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [startPosition, setStartPosition] = useState(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      setStartPosition(direction === "horizontal" ? e.clientX : e.clientY)
    },
    [direction],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return

      const currentPosition = direction === "horizontal" ? e.clientX : e.clientY
      const delta = currentPosition - startPosition

      onResize(delta)
      setStartPosition(currentPosition)
    },
    [isDragging, startPosition, direction, onResize],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize"
      document.body.style.userSelect = "none"

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp, direction])

  const baseClasses =
    direction === "horizontal"
      ? "w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600"
      : "h-1 cursor-row-resize hover:bg-blue-500 active:bg-blue-600"

  return (
    <div
      className={`bg-gray-300 transition-colors duration-150 flex-shrink-0 ${baseClasses} ${className} ${
        isDragging ? "bg-blue-600" : ""
      }`}
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation={direction === "horizontal" ? "vertical" : "horizontal"}
      title={`Drag to resize ${direction === "horizontal" ? "width" : "height"}`}
    />
  )
}
