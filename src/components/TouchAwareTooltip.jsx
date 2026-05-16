"use client"

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const LONG_PRESS_MS = 550

/**
 * True when the device likely uses touch as primary input (no hover or coarse pointer).
 */
export function useTouchPrimaryInput() {
  const [touchPrimary, setTouchPrimary] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(hover: none), (pointer: coarse)")
    const update = () => setTouchPrimary(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  return touchPrimary
}

function chainHandlers(a, b) {
  return (e) => {
    a?.(e)
    b?.(e)
  }
}

/**
 * Desktop: normal Radix tooltip on hover/focus.
 * Touch-primary: hold ~0.5s to open the tooltip; quick tap performs the control’s normal action only.
 */
export function TouchAwareTooltip({
  children,
  tooltip,
  side = "bottom",
  align = "center",
  contentClassName,
  showTouchFooter = true,
}) {
  const touchPrimary = useTouchPrimaryInput()
  const [open, setOpen] = useState(false)
  const longTimerRef = useRef(null)
  const suppressNextClickRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (longTimerRef.current != null) {
      clearTimeout(longTimerRef.current)
      longTimerRef.current = null
    }
  }, [])

  const onPointerDownTouch = useCallback(
    (e) => {
      if (!touchPrimary || e.pointerType !== "touch") return
      clearTimer()
      longTimerRef.current = window.setTimeout(() => {
        longTimerRef.current = null
        setOpen(true)
        suppressNextClickRef.current = true
        try {
          navigator.vibrate?.(12)
        } catch {
          /* ignore */
        }
      }, LONG_PRESS_MS)
    },
    [touchPrimary, clearTimer]
  )

  const onPointerEndTouch = useCallback(
    (e) => {
      if (!touchPrimary || e.pointerType !== "touch") return
      clearTimer()
    },
    [touchPrimary, clearTimer]
  )

  const content = (
    <>
      {tooltip}
      {touchPrimary && showTouchFooter ? (
        <p className="mt-2 border-t border-border pt-2 text-[0.65rem] leading-snug text-muted-foreground">
          Touch: hold icon to see this. Tap quickly to use the control.
        </p>
      ) : null}
    </>
  )

  if (!touchPrimary) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align} className={contentClassName}>
          {content}
        </TooltipContent>
      </Tooltip>
    )
  }

  let only
  try {
    only = Children.only(children)
  } catch {
    return children
  }

  if (!isValidElement(only)) {
    return (
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align} className={cn("max-w-xs", contentClassName)}>
          {content}
        </TooltipContent>
      </Tooltip>
    )
  }

  const mergedChild = cloneElement(only, {
    onPointerDown: chainHandlers(only.props.onPointerDown, onPointerDownTouch),
    onPointerUp: chainHandlers(only.props.onPointerUp, onPointerEndTouch),
    onPointerCancel: chainHandlers(only.props.onPointerCancel, onPointerEndTouch),
    onClick: (e) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false
        e.preventDefault()
        e.stopPropagation()
        return
      }
      only.props.onClick?.(e)
    },
  })

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>{mergedChild}</TooltipTrigger>
      <TooltipContent side={side} align={align} className={cn("max-w-xs", contentClassName)}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
