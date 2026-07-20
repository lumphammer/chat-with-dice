import { ImageLoadingOverlay } from "./ImageLoadingOverlay";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type ImageLoadState = "loading" | "loaded" | "error";

const MIN_ZOOM = 1;
const MIN_MAX_ZOOM = 4;
const NATURAL_SIZE_ZOOM_MULTIPLIER = 4;
const WHEEL_ZOOM_SPEED = 0.0015;
const PINCH_ZOOM_SPEED = 1;
// Wait this long before showing the spinner so quick loads don't flash it.
const SPINNER_DELAY_MS = 400;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function getFitScale(naturalSize: Size | null, viewportSize: Size | null) {
  if (!naturalSize || !viewportSize) return 1;
  return Math.min(
    viewportSize.width / naturalSize.width,
    viewportSize.height / naturalSize.height,
    1,
  );
}

function getMaxZoom(naturalSize: Size | null, viewportSize: Size | null) {
  const fitScale = getFitScale(naturalSize, viewportSize);
  return Math.max(MIN_MAX_ZOOM, (1 / fitScale) * NATURAL_SIZE_ZOOM_MULTIPLIER);
}

function clampCenter(
  center: Point,
  zoom: number,
  naturalSize: Size | null,
  viewportSize: Size | null,
) {
  if (!naturalSize || !viewportSize) return center;

  const scale = getFitScale(naturalSize, viewportSize) * zoom;
  const halfVisibleWidth = viewportSize.width / (2 * scale);
  const halfVisibleHeight = viewportSize.height / (2 * scale);

  return {
    x:
      naturalSize.width * scale <= viewportSize.width
        ? naturalSize.width / 2
        : clamp(
            center.x,
            halfVisibleWidth,
            naturalSize.width - halfVisibleWidth,
          ),
    y:
      naturalSize.height * scale <= viewportSize.height
        ? naturalSize.height / 2
        : clamp(
            center.y,
            halfVisibleHeight,
            naturalSize.height - halfVisibleHeight,
          ),
  };
}

export const ImagePreview = memo(
  ({ src, alt }: { src: string; alt: string }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const pointersRef = useRef(new Map<number, Point>());
    const dragStartRef = useRef<{
      center: Point;
      pointer: Point;
    } | null>(null);
    const pinchStartRef = useRef<{
      center: Point;
      distance: number;
      midpoint: Point;
      zoom: number;
    } | null>(null);
    const movedRef = useRef(false);

    const [naturalSize, setNaturalSize] = useState<Size | null>(null);
    const [viewportSize, setViewportSize] = useState<Size | null>(null);
    const [center, setCenter] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(MIN_ZOOM);
    const [isDragging, setIsDragging] = useState(false);
    const [imageLoadState, setImageLoadState] =
      useState<ImageLoadState>("loading");
    const [showSpinner, setShowSpinner] = useState(false);

    const fitScale = useMemo(
      () => getFitScale(naturalSize, viewportSize),
      [naturalSize, viewportSize],
    );
    const maxZoom = useMemo(
      () => getMaxZoom(naturalSize, viewportSize),
      [naturalSize, viewportSize],
    );
    const needsExpand =
      !!naturalSize &&
      !!viewportSize &&
      (naturalSize.width > viewportSize.width ||
        naturalSize.height > viewportSize.height);
    const isZoomed = zoom > MIN_ZOOM;
    const scale = fitScale * zoom;

    const getViewportPoint = useCallback((clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }, []);

    const zoomAt = useCallback(
      (nextZoom: number, viewportPoint: Point) => {
        if (!naturalSize || !viewportSize) return;

        const clampedZoom = clamp(nextZoom, MIN_ZOOM, maxZoom);
        const currentScale = fitScale * zoom;
        const imagePoint = {
          x:
            center.x +
            (viewportPoint.x - viewportSize.width / 2) / currentScale,
          y:
            center.y +
            (viewportPoint.y - viewportSize.height / 2) / currentScale,
        };
        const nextScale = fitScale * clampedZoom;
        const nextCenter = {
          x:
            imagePoint.x -
            (viewportPoint.x - viewportSize.width / 2) / nextScale,
          y:
            imagePoint.y -
            (viewportPoint.y - viewportSize.height / 2) / nextScale,
        };

        setZoom(clampedZoom);
        setCenter(
          clampCenter(nextCenter, clampedZoom, naturalSize, viewportSize),
        );
      },
      [center, fitScale, maxZoom, naturalSize, viewportSize, zoom],
    );

    const resetView = useCallback(() => {
      if (!naturalSize) return;
      setZoom(MIN_ZOOM);
      setCenter({ x: naturalSize.width / 2, y: naturalSize.height / 2 });
    }, [naturalSize]);

    const zoomToNaturalSize = useCallback(() => {
      if (!naturalSize || !viewportSize) return;
      const naturalZoom = clamp(1 / fitScale, MIN_ZOOM, maxZoom);
      setZoom(naturalZoom);
      setCenter(
        clampCenter(
          { x: naturalSize.width / 2, y: naturalSize.height / 2 },
          naturalZoom,
          naturalSize,
          viewportSize,
        ),
      );
    }, [fitScale, maxZoom, naturalSize, viewportSize]);

    // Capture the image's natural geometry and reset the view. Shared by the
    // onLoad handler and the cached-image path below so both initialise it.
    const initGeometry = useCallback((img: HTMLImageElement) => {
      const size = { width: img.naturalWidth, height: img.naturalHeight };
      setNaturalSize(size);
      setCenter({ x: size.width / 2, y: size.height / 2 });
      setZoom(MIN_ZOOM);
    }, []);

    const handleLoad = () => {
      const img = imgRef.current;
      if (!img?.naturalWidth) return;
      initGeometry(img);
      setImageLoadState("loaded");
    };

    const handleError = () => setImageLoadState("error");

    // Reset load tracking when the source changes. If the browser already has
    // the image cached it may finish (or fail) before React attaches the
    // onLoad/onError handlers, so derive the state from the ref. A cached image
    // won't fire onLoad, so initialise its geometry here too — otherwise
    // naturalSize/center/zoom would stay stale for cached loads.
    useEffect(() => {
      const img = imgRef.current;
      if (img?.complete && img.naturalWidth > 0) {
        initGeometry(img);
        setImageLoadState("loaded");
      } else {
        setImageLoadState(img?.complete ? "error" : "loading");
      }
    }, [src, initGeometry]);

    // Only reveal the spinner after a brief pause, then let it fade in. Keying
    // on `src` too restarts the pause for each new image and clears any spinner
    // left over from the previous one.
    useEffect(() => {
      setShowSpinner(false);
      if (imageLoadState !== "loading") return;
      const timer = setTimeout(() => setShowSpinner(true), SPINNER_DELAY_MS);
      return () => clearTimeout(timer);
    }, [src, imageLoadState]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const updateViewportSize = () => {
        setViewportSize({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      };

      updateViewportSize();
      const observer = new ResizeObserver(updateViewportSize);
      observer.observe(container);
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      setCenter((current) =>
        clampCenter(current, zoom, naturalSize, viewportSize),
      );
    }, [naturalSize, viewportSize, zoom]);

    const handleClick = () => {
      if (!needsExpand || movedRef.current) return;
      if (isZoomed) {
        resetView();
      } else {
        zoomToNaturalSize();
      }
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      if (!naturalSize || !viewportSize) return;
      e.preventDefault();
      const point = getViewportPoint(e.clientX, e.clientY);
      if (!point) return;
      zoomAt(zoom * Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED), point);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      const point = getViewportPoint(e.clientX, e.clientY);
      if (!point) return;

      e.currentTarget.setPointerCapture(e.pointerId);
      pointersRef.current.set(e.pointerId, point);
      movedRef.current = false;

      if (pointersRef.current.size === 1) {
        dragStartRef.current = { center, pointer: point };
        setIsDragging(isZoomed);
      } else if (pointersRef.current.size === 2) {
        const [first, second] = Array.from(pointersRef.current.values());
        const startDistance = distance(first, second);
        if (startDistance === 0) return;

        pinchStartRef.current = {
          center,
          distance: startDistance,
          midpoint: midpoint(first, second),
          zoom,
        };
      }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      const point = getViewportPoint(e.clientX, e.clientY);
      if (!point || !naturalSize || !viewportSize) return;
      if (!pointersRef.current.has(e.pointerId)) return;

      pointersRef.current.set(e.pointerId, point);

      if (pointersRef.current.size >= 2 && pinchStartRef.current) {
        const [first, second] = Array.from(pointersRef.current.values());
        const nextDistance = distance(first, second);
        if (nextDistance === 0) return;

        movedRef.current = true;
        const start = pinchStartRef.current;
        const nextZoom = clamp(
          start.zoom * (nextDistance / start.distance) ** PINCH_ZOOM_SPEED,
          MIN_ZOOM,
          maxZoom,
        );
        const currentMidpoint = midpoint(first, second);
        const nextScale = fitScale * nextZoom;
        const imagePoint = {
          x:
            start.center.x +
            (start.midpoint.x - viewportSize.width / 2) /
              (fitScale * start.zoom),
          y:
            start.center.y +
            (start.midpoint.y - viewportSize.height / 2) /
              (fitScale * start.zoom),
        };
        const nextCenter = {
          x:
            imagePoint.x -
            (currentMidpoint.x - viewportSize.width / 2) / nextScale,
          y:
            imagePoint.y -
            (currentMidpoint.y - viewportSize.height / 2) / nextScale,
        };

        setZoom(nextZoom);
        setCenter(clampCenter(nextCenter, nextZoom, naturalSize, viewportSize));
        return;
      }

      if (!isZoomed || !dragStartRef.current) return;

      const delta = {
        x: point.x - dragStartRef.current.pointer.x,
        y: point.y - dragStartRef.current.pointer.y,
      };
      if (Math.abs(delta.x) > 2 || Math.abs(delta.y) > 2) {
        movedRef.current = true;
      }

      const nextCenter = {
        x: dragStartRef.current.center.x - delta.x / scale,
        y: dragStartRef.current.center.y - delta.y / scale,
      };
      setCenter(clampCenter(nextCenter, zoom, naturalSize, viewportSize));
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      pointersRef.current.delete(e.pointerId);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      setIsDragging(false);

      if (pointersRef.current.size === 1) {
        const [remainingPointer] = Array.from(pointersRef.current.values());
        dragStartRef.current = { center, pointer: remainingPointer };
        pinchStartRef.current = null;
      } else if (pointersRef.current.size === 0) {
        dragStartRef.current = null;
        pinchStartRef.current = null;
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Enter" || !needsExpand) return;
      if (isZoomed) {
        resetView();
      } else {
        zoomToNaturalSize();
      }
    };

    const translate =
      naturalSize && viewportSize
        ? {
            x: viewportSize.width / 2 - center.x * scale,
            y: viewportSize.height / 2 - center.y * scale,
          }
        : { x: 0, y: 0 };

    return (
      // oxlint-disable-next-line jsx_a11y/no-static-element-interactions
      <div
        ref={containerRef}
        className={`relative flex-1 touch-none overflow-hidden
          data-draggable:cursor-grab data-dragging:cursor-grabbing
          data-needs-expand:cursor-zoom-in
          data-needs-expand:data-zoomed:cursor-grab`}
        data-needs-expand={needsExpand || undefined}
        data-zoomed={isZoomed || undefined}
        data-draggable={isZoomed || undefined}
        data-dragging={isDragging || undefined}
        tabIndex={needsExpand ? 0 : undefined}
        role={needsExpand ? "button" : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        style={{
          // cool self-glow effect. this is slow as molasses on iOS because it
          // doesn't use the GPU for SVG filters, but thanks to the use of
          // translate3d below, we effectively hide the pixels from the effect
          // on iOS. This means that iOS doesn't get the benefit of the effect,
          // but also runs smoothly. Users on other browsers get the effect and
          // it's smooth because it's GPU accelerated.
          filter: "url(#hard-outer-glow)",
        }}
      >
        <img
          ref={imgRef}
          src={src}
          className="pointer-events-none absolute top-0 left-0 max-w-none
            select-none"
          style={{
            transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
            transformOrigin: "top left",
          }}
          draggable={false}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
        />
        {showSpinner && imageLoadState === "loading" && <ImageLoadingOverlay />}
      </div>
    );
  },
);

ImagePreview.displayName = "ImagePreview";
