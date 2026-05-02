import { memo, useEffect, useRef, useState } from "react";

export const ImagePreview = memo(
  ({ src, alt }: { src: string; alt: string }) => {
    const [expanded, setExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [needsExpand, setNeedsExpand] = useState(false);

    const checkNeedsExpand = () => {
      const img = imgRef.current;
      const container = containerRef.current;
      if (!img || !container || !img.naturalWidth) return;
      setNeedsExpand(
        img.naturalWidth > container.clientWidth ||
          img.naturalHeight > container.clientHeight,
      );
    };

    // check after load + one frame for layout to settle
    const handleLoad = () => {
      requestAnimationFrame(checkNeedsExpand);
    };

    // re-check on container resize
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const observer = new ResizeObserver(checkNeedsExpand);
      observer.observe(container);
      return () => observer.disconnect();
    }, []);

    const toggle = () => setExpanded((v) => !v);

    return (
      // oxlint-disable-next-line jsx_a11y/no-static-element-interactions
      <div
        ref={containerRef}
        className={`relative flex flex-1 overflow-auto
          data-needs-expand:cursor-zoom-in
          data-needs-expand:data-expanded:cursor-zoom-out`}
        data-needs-expand={needsExpand || undefined}
        tabIndex={needsExpand ? 0 : undefined}
        role={needsExpand ? "button" : undefined}
        onClick={needsExpand ? toggle : undefined}
        data-expanded={expanded || undefined}
        onKeyDown={
          needsExpand
            ? (e) => {
                if (e.key === "Enter") toggle();
              }
            : undefined
        }
      >
        <img
          ref={imgRef}
          src={src}
          className={`m-auto max-h-full max-w-full data-expanded:max-h-none
            data-expanded:max-w-none`}
          data-expanded={expanded || undefined}
          alt={alt}
          onLoad={handleLoad}
        />
      </div>
    );
  },
);

ImagePreview.displayName = "ImagePreview";
