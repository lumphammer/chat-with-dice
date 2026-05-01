import { memo, useCallback, useMemo, useState } from "react";
import { actions } from "astro:actions";
import { Breadcrumbs, type BreadcrumbSegment } from "./Breadcrumbs";
import { DropOverlay } from "./DropOverlay";
import { EmptyState } from "./EmptyState";
import { FileListItem } from "./FileListItem";
import { FilePreview } from "./FilePreview";
import { Toolbar } from "./Toolbar";
import type { FileNode } from "./types";
import { UploadingList } from "./UploadingList";
import { useUpload } from "./useUpload";

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

    const refetchNodes = useCallback(
      async (folderId: string | null) => {
        const result = await actions.getNodes({ folderId });
        if (result.error) {
          console.error("Failed to fetch nodes:", result.error);
          return;
        }
        setNodes(result.data);
      },
      [],
    );

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

    const navigateTo = useCallback(
      async (folderId: string | null, path: string) => {
        setIsLoading(true);
        setPreviewNode(null);

        window.history.pushState(null, "", path);

        // update breadcrumbs based on navigation
        if (folderId === null) {
          setBreadcrumbs([]);
        }

        await refetchNodes(folderId);
        setCurrentFolderId(folderId);
        setIsLoading(false);
      },
      [refetchNodes],
    );

    const handleFolderClick = useCallback(
      (node: FileNode) => {
        const newBreadcrumbs = [
          ...breadcrumbs,
          { id: node.id, name: node.name },
        ];
        setBreadcrumbs(newBreadcrumbs);
        const path =
          "/files/" + newBreadcrumbs.map((s) => s.name).join("/");
        void navigateTo(node.id, path);
      },
      [breadcrumbs, navigateTo],
    );

    const handleFileClick = useCallback(
      (node: FileNode) => {
        const path =
          "/files/" +
          [...breadcrumbs.map((s) => s.name), node.name].join("/");
        window.history.pushState(null, "", path);
        setPreviewNode(node);
      },
      [breadcrumbs],
    );

    const handleClosePreview = useCallback(() => {
      const path =
        breadcrumbs.length > 0
          ? "/files/" + breadcrumbs.map((s) => s.name).join("/")
          : "/files";
      window.history.pushState(null, "", path);
      setPreviewNode(null);
    }, [breadcrumbs]);

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
        if (folderId === null) {
          setBreadcrumbs([]);
        } else {
          const index = breadcrumbs.findIndex((s) => s.id === folderId);
          if (index !== -1) {
            setBreadcrumbs(breadcrumbs.slice(0, index + 1));
          }
        }
        void navigateTo(folderId, path);
      },
      [breadcrumbs, navigateTo],
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

    if (previewNode) {
      return (
        <div className="w-full max-w-2xl">
          <Breadcrumbs
            segments={breadcrumbs}
            onNavigate={handleBreadcrumbNavigate}
          />
          <FilePreview node={previewNode} onClose={handleClosePreview} />
        </div>
      );
    }

    return (
      <div
        className="relative w-full max-w-2xl"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && <DropOverlay />}

        <div className="mb-4 flex items-center justify-between">
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
          <div className="flex flex-col gap-2 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : folderNodes.length === 0 &&
          fileNodes.length === 0 &&
          uploading.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-1">
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
      </div>
    );
  },
);

FileManager.displayName = "FileManager";
