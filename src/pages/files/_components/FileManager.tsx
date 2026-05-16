import { Breadcrumbs } from "./Breadcrumbs";
import { DropOverlay } from "./DropOverlay";
import { EmptyState } from "./EmptyState";
import { FileListItem } from "./FileListItem";
import { FilePreview } from "./FilePreview";
import { Toolbar } from "./Toolbar";
import { UploadingList } from "./UploadingList";
import type { BreadcrumbSegment, FileManagerLocation, FileNode } from "./types";
import { useUpload } from "./useUpload";
import { actions } from "astro:actions";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

const VIEW_MODE_STORAGE_KEY = "file-manager-view-mode";
type ViewMode = "list" | "grid";

export type FileManagerProps = {
  initialNodes?: FileNode[];
  location: FileManagerLocation;
  onLocationChange: (location: FileManagerLocation) => void;
};

const getStoredViewMode = (): ViewMode => {
  if (typeof window === "undefined") return "list";

  const storedViewMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return storedViewMode === "grid" ? "grid" : "list";
};

export const FileManager = memo(
  ({ initialNodes, location, onLocationChange }: FileManagerProps) => {
    const [nodes, setNodes] = useState<FileNode[]>(() => initialNodes ?? []);
    const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isLoading, setIsLoading] = useState(initialNodes === undefined);

    // monotonic counter to discard stale responses from earlier navigations
    const navigationIdRef = useRef(0);
    const shouldSkipInitialFetch = useRef(initialNodes !== undefined);

    const fetchNodes = useCallback(
      async (folderId: string | null, requestId: number) => {
        const result = await actions.files.getNodes({ folderId });
        if (requestId !== navigationIdRef.current) return false;
        if (result.error) {
          console.error("Failed to fetch nodes:", result.error);
          return true;
        }
        setNodes(result.data);
        return true;
      },
      [],
    );

    const refetchNodes = useCallback(
      async (folderId: string | null) => {
        const requestId = navigationIdRef.current;
        await fetchNodes(folderId, requestId);
      },
      [fetchNodes],
    );

    useEffect(() => {
      if (shouldSkipInitialFetch.current) {
        shouldSkipInitialFetch.current = false;
        return;
      }

      const requestId = ++navigationIdRef.current;
      setIsLoading(true);

      void (async () => {
        const isCurrent = await fetchNodes(location.folderId, requestId);
        if (isCurrent) {
          setIsLoading(false);
        }
      })();
    }, [fetchNodes, location.folderId]);

    const { uploading, uploadFiles, dismissError } = useUpload(
      location.folderId,
      () => refetchNodes(location.folderId),
    );

    const handleViewModeChange = useCallback((nextViewMode: ViewMode) => {
      setViewMode(nextViewMode);
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, nextViewMode);
    }, []);

    const folderNodes = useMemo(
      () =>
        nodes
          .filter((n) => n.folder)
          .sort((a, b) => a.name.localeCompare(b.name)),
      [nodes],
    );

    const fileNodes = useMemo(
      () =>
        nodes
          .filter((n) => n.file)
          .sort((a, b) => a.name.localeCompare(b.name)),
      [nodes],
    );

    const previewNode = useMemo(
      () =>
        location.previewFileId
          ? (nodes.find((node) => node.id === location.previewFileId) ?? null)
          : null,
      [location.previewFileId, nodes],
    );

    const handleFolderClick = useCallback(
      (node: FileNode) => {
        onLocationChange({
          folderId: node.id,
          breadcrumbs: [
            ...location.breadcrumbs,
            { id: node.id, name: node.name },
          ],
          previewFileId: null,
          previewFileName: null,
        });
      },
      [location.breadcrumbs, onLocationChange],
    );

    const handleFolderCreated = useCallback(
      (folder: { id: string; name: string }) => {
        onLocationChange({
          folderId: folder.id,
          breadcrumbs: [...location.breadcrumbs, folder],
          previewFileId: null,
          previewFileName: null,
        });
      },
      [location.breadcrumbs, onLocationChange],
    );

    const handleFileClick = useCallback(
      (node: FileNode) => {
        onLocationChange({
          folderId: location.folderId,
          breadcrumbs: location.breadcrumbs,
          previewFileId: node.id,
          previewFileName: node.name,
        });
      },
      [location, onLocationChange],
    );

    const handleClosePreview = useCallback(() => {
      onLocationChange({
        folderId: location.folderId,
        breadcrumbs: location.breadcrumbs,
        previewFileId: null,
        previewFileName: null,
      });
    }, [location, onLocationChange]);

    const handleDeleted = useCallback(
      (nodeId: string) => {
        setNodes((prev) => prev.filter((n) => n.id !== nodeId));
        if (nodeId === location.previewFileId) {
          onLocationChange({
            folderId: location.folderId,
            breadcrumbs: location.breadcrumbs,
            previewFileId: null,
            previewFileName: null,
          });
        }
      },
      [location, onLocationChange],
    );

    const handleRenamed = useCallback((nodeId: string, newName: string) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, name: newName } : n)),
      );
    }, []);

    const handleBreadcrumbNavigate = useCallback(
      (folderId: string | null) => {
        let breadcrumbs: BreadcrumbSegment[];
        if (folderId === null) {
          breadcrumbs = [];
        } else {
          const index = location.breadcrumbs.findIndex(
            (segment) => segment.id === folderId,
          );
          breadcrumbs =
            index !== -1
              ? location.breadcrumbs.slice(0, index + 1)
              : location.breadcrumbs;
        }
        onLocationChange({
          folderId,
          breadcrumbs,
          previewFileId: null,
          previewFileName: null,
        });
      },
      [location.breadcrumbs, onLocationChange],
    );

    const handleDragEnter = useCallback((event: React.DragEvent) => {
      event.preventDefault();
      const hasFiles = [...event.dataTransfer.types].includes("Files");
      if (hasFiles) {
        setIsDragOver(true);
      }
    }, []);

    const handleDragOver = useCallback((event: React.DragEvent) => {
      event.preventDefault();
    }, []);

    const handleDragLeave = useCallback((event: React.DragEvent) => {
      const relatedTarget = event.relatedTarget;
      if (
        relatedTarget instanceof Node &&
        event.currentTarget.contains(relatedTarget)
      ) {
        return;
      }
      setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
      (event: React.DragEvent) => {
        event.preventDefault();
        setIsDragOver(false);
        const files = event.dataTransfer.files;
        if (files.length > 0) {
          void uploadFiles(files);
        }
      },
      [uploadFiles],
    );

    return (
      <div
        className="relative w-full max-w-2xl"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && <DropOverlay />}

        <div className="mb-4 flex flex-wrap items-center justify-between">
          <Breadcrumbs
            segments={location.breadcrumbs}
            onNavigate={handleBreadcrumbNavigate}
          />
          <Toolbar
            currentFolderId={location.folderId}
            onFolderCreated={handleFolderCreated}
            onFilesSelected={uploadFiles}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />
        </div>

        {isLoading ? (
          <div className="animate-fadein-slow flex flex-col gap-2 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : folderNodes.length === 0 &&
          fileNodes.length === 0 &&
          uploading.length === 0 ? (
          <EmptyState />
        ) : (
          <ul
            className={
              viewMode === "grid"
                ? `animate-fadein grid grid-cols-2 gap-3 sm:grid-cols-3
                  md:grid-cols-4`
                : "animate-fadein flex flex-col gap-1"
            }
          >
            {folderNodes.map((node) => (
              <FileListItem
                key={node.id}
                node={node}
                variant={viewMode}
                onClick={() => handleFolderClick(node)}
                onDeleted={handleDeleted}
                onRenamed={handleRenamed}
              />
            ))}
            {fileNodes.map((node) => (
              <FileListItem
                key={node.id}
                node={node}
                variant={viewMode}
                onClick={() => handleFileClick(node)}
                onDeleted={handleDeleted}
                onRenamed={handleRenamed}
              />
            ))}
          </ul>
        )}

        <UploadingList files={uploading} onDismiss={dismissError} />

        {previewNode && (
          <FilePreview node={previewNode} onClose={handleClosePreview} />
        )}
      </div>
    );
  },
);

FileManager.displayName = "FileManager";
