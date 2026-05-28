import { authClient } from "#/utils/auth-client";
import { useRefStash } from "../useRefStash";
import { useStateWithRef } from "../useStateWithRef";
import { Breadcrumbs } from "./Breadcrumbs";
import { DropOverlay } from "./DropOverlay";
import { EmptyState } from "./EmptyState";
import { FileListItem } from "./FileListItem";
import { FilePreview } from "./FilePreview";
import { Toolbar } from "./Toolbar";
import { UploadingList } from "./UploadingList";
import type { BreadcrumbSegment, FileManagerLocation, FileNode } from "./types";
import { useUpload } from "./useUpload";
import { viewModeStore, type ViewMode } from "./viewModeStore";
import { useStore } from "@nanostores/react";
import { actions } from "astro:actions";
import type { LucideIcon } from "lucide-react";
import {
  memo,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const HEADER_GAP_PX = 8;
const MIN_BREADCRUMB_WIDTH_PX = 180;

const useElementWidth = <T extends HTMLElement>(
  ref: RefObject<T | null>,
): number => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateWidth = () => {
      setWidth(element.getBoundingClientRect().width);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
};

type ReadOnlyProps =
  | { ownerUserId?: undefined; roomId?: undefined }
  | { ownerUserId: string; roomId: string };

export const FileManager = memo(
  ({
    initialNodes,
    location,
    onLocationChange,
    ownerUserId,
    roomId,
    rootIcon,
    rootLabel,
  }: {
    initialNodes?: FileNode[];
    location: FileManagerLocation;
    onLocationChange: (location: FileManagerLocation) => void;
    rootIcon?: LucideIcon;
    rootLabel?: string;
  } & ReadOnlyProps) => {
    const session = authClient.useSession();
    const sessionRef = useRefStash(session);
    const locationRef = useRefStash(location);

    const readOnly = ownerUserId !== undefined;
    const [nodes, setNodes] = useState<FileNode[]>(() => initialNodes ?? []);

    const viewMode = useStore(viewModeStore);

    const [showDeleted, setShowDeleted, showDeletedRef] =
      useStateWithRef(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isLoading, setIsLoading] = useState(initialNodes === undefined);
    const [breadcrumbWidths, setBreadcrumbWidths] = useState({
      compact: 0,
      full: 0,
    });
    const [expandedToolbarWidth, setExpandedToolbarWidth] = useState(0);
    const headerRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const headerWidth = useElementWidth(headerRef);
    const toolbarWidth = useElementWidth(toolbarRef);
    const hasHeaderMeasurements = headerWidth > 0 && expandedToolbarWidth > 0;
    const isToolbarCompact =
      hasHeaderMeasurements &&
      headerWidth - expandedToolbarWidth - HEADER_GAP_PX <
        MIN_BREADCRUMB_WIDTH_PX;
    const activeToolbarWidth = toolbarWidth || expandedToolbarWidth;
    const breadcrumbAvailableWidth =
      headerWidth > 0
        ? Math.max(0, headerWidth - activeToolbarWidth - HEADER_GAP_PX)
        : undefined;
    const shouldCollapseBreadcrumbs =
      breadcrumbAvailableWidth !== undefined &&
      location.breadcrumbs.length > 1 &&
      breadcrumbWidths.full > breadcrumbAvailableWidth;

    // monotonic counter to discard stale responses from earlier navigations
    const navigationIdRef = useRef(0);
    const shouldSkipInitialFetch = useRef(initialNodes !== undefined);

    useEffect(() => {
      if (isToolbarCompact || toolbarWidth === 0) return;
      setExpandedToolbarWidth(toolbarWidth);
    }, [isToolbarCompact, toolbarWidth]);

    // main fn to fetch folder contents
    const fetchNodes = useCallback(async () => {
      const folderId = locationRef.current.folderId;
      navigationIdRef.current += 1;
      const requestId = navigationIdRef.current;
      setIsLoading(true);
      const result = await actions.files.getNodes({
        folderId,
        ownerUserId,
        roomId,
        includeDeleted: showDeletedRef.current,
      });
      if (navigationIdRef.current === requestId) {
        setIsLoading(false);
      }
      if (result.error) {
        console.error("Failed to fetch nodes:", result.error);
        return;
      }
      setNodes(result.data);
    }, [ownerUserId, roomId, locationRef.current.folderId, showDeletedRef]);

    const handleRefresh = useCallback(async () => {
      await fetchNodes();
      await sessionRef.current.refetch();
    }, [fetchNodes, sessionRef]);

    // when the folder id or showDeleted changes, we update
    useEffect(() => {
      if (shouldSkipInitialFetch.current) {
        shouldSkipInitialFetch.current = false;
        return;
      }
      void fetchNodes();
    }, [fetchNodes, location.folderId, showDeleted]);

    const { uploading, uploadFiles, dismissError } = useUpload(
      location.folderId,
      handleRefresh,
    );

    const handleViewModeChange = useCallback((nextViewMode: ViewMode) => {
      viewModeStore.set(nextViewMode);
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
      async (nodeId: string) => {
        setNodes((prev) => prev.filter((n) => n.id !== nodeId));
        await sessionRef.current.refetch();
        if (nodeId === location.previewFileId) {
          onLocationChange({
            folderId: location.folderId,
            breadcrumbs: location.breadcrumbs,
            previewFileId: null,
            previewFileName: null,
          });
        }
      },
      [location, onLocationChange, sessionRef],
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
        className="@container relative w-full max-w-2xl min-w-0"
        onDragEnter={readOnly ? undefined : handleDragEnter}
        onDragOver={readOnly ? undefined : handleDragOver}
        onDragLeave={readOnly ? undefined : handleDragLeave}
        onDrop={readOnly ? undefined : handleDrop}
      >
        {isDragOver && !readOnly && <DropOverlay />}

        <div ref={headerRef} className="mb-4 flex min-w-0 items-center gap-2">
          <Breadcrumbs
            collapsed={shouldCollapseBreadcrumbs}
            onMeasuredWidths={setBreadcrumbWidths}
            segments={location.breadcrumbs}
            onNavigate={handleBreadcrumbNavigate}
            rootIcon={rootIcon}
            rootLabel={rootLabel}
          />
          <div ref={toolbarRef} className="shrink-0">
            <Toolbar
              compact={isToolbarCompact}
              currentFolderId={location.folderId}
              onFolderCreated={handleFolderCreated}
              onFilesSelected={uploadFiles}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              showDeleted={showDeleted}
              onShowDeletedChange={setShowDeleted}
              readOnly={readOnly}
              onRefresh={handleRefresh}
            />
          </div>
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
                ? `animate-fadein grid min-w-0 grid-cols-2 gap-3 @sm:grid-cols-3
                  @md:grid-cols-4`
                : "animate-fadein flex min-w-0 flex-col gap-1"
            }
          >
            {folderNodes.map((node) => (
              <FileListItem
                key={node.id}
                node={node}
                viewMode={viewMode}
                onClick={() => handleFolderClick(node)}
                onDeleted={handleDeleted}
                onRenamed={handleRenamed}
                ownerUserId={ownerUserId}
                roomId={roomId}
                readOnly={readOnly}
              />
            ))}
            {fileNodes.map((node) => (
              <FileListItem
                key={node.id}
                node={node}
                viewMode={viewMode}
                onClick={() => handleFileClick(node)}
                onDeleted={handleDeleted}
                onRenamed={handleRenamed}
                ownerUserId={ownerUserId}
                roomId={roomId}
                readOnly={readOnly}
              />
            ))}
          </ul>
        )}

        {!readOnly && (
          <UploadingList files={uploading} onDismiss={dismissError} />
        )}

        {previewNode && (
          <FilePreview
            node={previewNode}
            onClose={handleClosePreview}
            ownerUserId={ownerUserId}
            roomId={roomId}
            readOnly={readOnly}
          />
        )}
      </div>
    );
  },
);

FileManager.displayName = "FileManager";
