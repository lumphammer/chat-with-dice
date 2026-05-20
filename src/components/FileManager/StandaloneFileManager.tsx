import { FileManager } from "./FileManager";
import type { BreadcrumbSegment, FileManagerLocation, FileNode } from "./types";
import { memo, useCallback, useEffect, useRef, useState } from "react";

type StandaloneFileManagerProps = {
  initialNodes?: FileNode[];
  initialLocation: FileManagerLocation;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isBreadcrumbSegment = (value: unknown): value is BreadcrumbSegment => {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.name === "string";
};

const isFileManagerLocation = (
  value: unknown,
): value is FileManagerLocation => {
  if (!isRecord(value)) return false;
  return (
    (typeof value.folderId === "string" || value.folderId === null) &&
    Array.isArray(value.breadcrumbs) &&
    value.breadcrumbs.every(isBreadcrumbSegment) &&
    (typeof value.previewFileId === "string" || value.previewFileId === null) &&
    (typeof value.previewFileName === "string" ||
      value.previewFileName === null)
  );
};

const toFileManagerPath = (location: FileManagerLocation) => {
  const segments = location.breadcrumbs.map((segment) =>
    encodeURIComponent(segment.name),
  );

  if (location.previewFileId && location.previewFileName) {
    segments.push(encodeURIComponent(location.previewFileName));
  }

  return segments.length > 0 ? `/files/${segments.join("/")}` : "/files";
};

export const StandaloneFileManager = memo(
  ({ initialNodes, initialLocation }: StandaloneFileManagerProps) => {
    const [location, setLocation] = useState(initialLocation);
    const hasSetInitialState = useRef(false);

    useEffect(() => {
      if (hasSetInitialState.current) return;
      hasSetInitialState.current = true;
      window.history.replaceState(
        initialLocation,
        "",
        toFileManagerPath(initialLocation),
      );
    }, [initialLocation]);

    useEffect(() => {
      const handlePopState = (event: PopStateEvent) => {
        if (!isFileManagerLocation(event.state)) {
          window.location.reload();
          return;
        }

        setLocation(event.state);
      };

      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    const handleLocationChange = useCallback(
      (nextLocation: FileManagerLocation) => {
        setLocation(nextLocation);
        window.history.pushState(
          nextLocation,
          "",
          toFileManagerPath(nextLocation),
        );
      },
      [],
    );

    return (
      <FileManager
        initialNodes={initialNodes}
        location={location}
        onLocationChange={handleLocationChange}
      />
    );
  },
);

StandaloneFileManager.displayName = "StandaloneFileManager";
