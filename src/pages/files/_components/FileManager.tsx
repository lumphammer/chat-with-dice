import { Breadcrumbs, type BreadcrumbSegment } from "./Breadcrumbs";
import { DropOverlay } from "./DropOverlay";
import { EmptyState } from "./EmptyState";
import { FileListItem } from "./FileListItem";
import { FilePreview } from "./FilePreview";
import { Toolbar } from "./Toolbar";
import { UploadingList } from "./UploadingList";
import type { FileNode } from "./types";
import { useUpload } from "./useUpload";
import { actions } from "astro:actions";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

export const FileManager = memo(
  ({
    initialNodes,
    initialFolderId = null,
    initialBreadcrumbs = [],
    initialPreviewFileId = null,
  }: {
    initialNodes: FileNode[];
    initialFolderId?: string | null;
    initialBreadcrumbs?: BreadcrumbSegment[];
    initialPreviewFileId?: string | null;
  }) => {
    const [nodes, setNodes] = useState(initialNodes);
    const [currentFolderId, setCurrentFolderId] = useState(initialFolderId);
    const [breadcrumbs, setBreadcrumbs] = useState(initialBreadcrumbs);

    const initialPreview = initialPreviewFileId
      ? (initialNodes.find((n) => n.id === initialPreviewFileId) ?? null)
      : null;
    const [previewNode, setPreviewNode] = useState<FileNode | null>(
      initialPreview,
    );
    const [isDragOver, setIsDragOver] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // monotonic counter to discard stale responses from earlier navigations
    const navigationIdRef = useRef(0);

    const refetchNodes = useCallback(async (folderId: string | null) => {
      const requestId = navigationIdRef.current;
      const result = await actions.files.getNodes({ folderId });
      if (requestId !== navigationIdRef.current) return; // stale
      if (result.error) {
        console.error("Failed to fetch nodes:", result.error);
        return;
      }
      setNodes(result.data);
    }, []);

    const { uploading, uploadFiles, dismissError } = useUpload(
      currentFolderId,
      () => refetchNodes(currentFolderId),
    );

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

    // history state shape stored with each pushState/replaceState
    type HistoryState = {
      folderId: string | null;
      breadcrumbs: BreadcrumbSegment[];
      previewFileId: string | null;
    };

    const pushHistoryState = useCallback(
      (path: string, state: HistoryState) => {
        window.history.pushState(state, "", path);
      },
      [],
    );

    // load a folder's contents and update React state (no history manipulation)
    const loadFolder = useCallback(
      async (folderId: string | null, newBreadcrumbs: BreadcrumbSegment[]) => {
        const requestId = ++navigationIdRef.current;
        setIsLoading(true);
        setPreviewNode(null);
        setBreadcrumbs(newBreadcrumbs);
        setCurrentFolderId(folderId);

        await refetchNodes(folderId);
        if (requestId === navigationIdRef.current) {
          setIsLoading(false);
        }
      },
      [refetchNodes],
    );

    // set initial history state so back button has something to restore
    const hasSetInitialState = useRef(false);
    useEffect(() => {
      if (hasSetInitialState.current) return;
      hasSetInitialState.current = true;

      const state: HistoryState = {
        folderId: initialFolderId,
        breadcrumbs: initialBreadcrumbs,
        previewFileId: initialPreviewFileId,
      };
      window.history.replaceState(state, "", window.location.pathname);
    }, [initialFolderId, initialBreadcrumbs, initialPreviewFileId]);

    // handle browser back/forward
    useEffect(() => {
      const handlePopState = (e: PopStateEvent) => {
        const state = e.state as HistoryState | null;
        if (!state) {
          window.location.reload();
          return;
        }

        setBreadcrumbs(state.breadcrumbs);
        setCurrentFolderId(state.folderId);

        const requestId = ++navigationIdRef.current;
        void (async () => {
          const result = await actions.files.getNodes({
            folderId: state.folderId,
          });
          if (requestId !== navigationIdRef.current) return;
          if (result.error) {
            console.error("Failed to fetch nodes:", result.error);
            return;
          }
          setNodes(result.data);

          if (state.previewFileId) {
            const found = result.data.find((n) => n.id === state.previewFileId);
            setPreviewNode(found ?? null);
          } else {
            setPreviewNode(null);
          }
        })();
      };

      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    const handleFolderClick = useCallback(
      (node: FileNode) => {
        const newBreadcrumbs = [
          ...breadcrumbs,
          { id: node.id, name: node.name },
        ];
        const path =
          "/files/" +
          newBreadcrumbs.map((s) => encodeURIComponent(s.name)).join("/");
        pushHistoryState(path, {
          folderId: node.id,
          breadcrumbs: newBreadcrumbs,
          previewFileId: null,
        });
        void loadFolder(node.id, newBreadcrumbs);
      },
      [breadcrumbs, loadFolder, pushHistoryState],
    );

    const handleFileClick = useCallback(
      (node: FileNode) => {
        const path =
          "/files/" +
          [
            ...breadcrumbs.map((s) => encodeURIComponent(s.name)),
            encodeURIComponent(node.name),
          ].join("/");
        pushHistoryState(path, {
          folderId: currentFolderId,
          breadcrumbs,
          previewFileId: node.id,
        });
        setPreviewNode(node);
      },
      [breadcrumbs, currentFolderId, pushHistoryState],
    );

    const handleClosePreview = useCallback(() => {
      const path =
        breadcrumbs.length > 0
          ? "/files/" +
            breadcrumbs.map((s) => encodeURIComponent(s.name)).join("/")
          : "/files";
      pushHistoryState(path, {
        folderId: currentFolderId,
        breadcrumbs,
        previewFileId: null,
      });
      setPreviewNode(null);
    }, [breadcrumbs, currentFolderId, pushHistoryState]);

    const handleDeleted = useCallback((nodeId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    }, []);

    const handleRenamed = useCallback((nodeId: string, newName: string) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, name: newName } : n)),
      );
    }, []);

    const handleBreadcrumbNavigate = useCallback(
      (folderId: string | null, path: string) => {
        let newBreadcrumbs: BreadcrumbSegment[];
        if (folderId === null) {
          newBreadcrumbs = [];
        } else {
          const index = breadcrumbs.findIndex((s) => s.id === folderId);
          newBreadcrumbs =
            index !== -1 ? breadcrumbs.slice(0, index + 1) : breadcrumbs;
        }
        pushHistoryState(path, {
          folderId,
          breadcrumbs: newBreadcrumbs,
          previewFileId: null,
        });
        void loadFolder(folderId, newBreadcrumbs);
      },
      [breadcrumbs, loadFolder, pushHistoryState],
    );

    // drag and drop handlers
    const handleDragEnter = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      // only hide overlay when leaving the container itself
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = e.dataTransfer.files;
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
            segments={breadcrumbs}
            onNavigate={handleBreadcrumbNavigate}
          />
          <Toolbar
            currentFolderId={currentFolderId}
            onFolderCreated={() => refetchNodes(currentFolderId)}
            onFilesSelected={uploadFiles}
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
          <ul className="animate-fadein flex flex-col gap-1">
            {folderNodes.map((node) => (
              <FileListItem
                key={node.id}
                node={node}
                onClick={() => handleFolderClick(node)}
                onDeleted={handleDeleted}
                onRenamed={handleRenamed}
              />
            ))}
            {fileNodes.map((node) => (
              <FileListItem
                key={node.id}
                node={node}
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
