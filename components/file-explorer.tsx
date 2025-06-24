"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react"
import type { FileNode } from "@/app/page"

interface FileExplorerProps {
  files: FileNode[]
  onFileSelect: (file: FileNode) => void
  activeFile: FileNode | null
}

interface FileTreeItemProps {
  node: FileNode
  level: number
  onFileSelect: (file: FileNode) => void
  activeFile: FileNode | null
  onToggleExpand: (nodeId: string) => void
}

function FileTreeItem({ node, level, onFileSelect, activeFile, onToggleExpand }: FileTreeItemProps) {
  const isActive = activeFile?.id === node.id

  const handleClick = () => {
    if (node.type === "folder") {
      onToggleExpand(node.id)
    } else {
      onFileSelect(node)
    }
  }

  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 ${
          isActive ? "bg-blue-50 text-blue-600" : "text-gray-700"
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === "folder" && (
          <div className="w-4 h-4 mr-1 flex items-center justify-center">
            {node.isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </div>
        )}
        <div className="w-4 h-4 mr-2 flex items-center justify-center">
          {node.type === "folder" ? (
            node.isExpanded ? (
              <FolderOpen className="w-4 h-4" />
            ) : (
              <Folder className="w-4 h-4" />
            )
          ) : (
            <File className="w-4 h-4" />
          )}
        </div>
        <span className="text-sm truncate">{node.name}</span>
      </div>
      {node.type === "folder" && node.isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              activeFile={activeFile}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FileExplorer({ files, onFileSelect, activeFile }: FileExplorerProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>(files)

  const handleToggleExpand = (nodeId: string) => {
    const updateNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, isExpanded: !node.isExpanded }
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) }
        }
        return node
      })
    }

    setFileTree(updateNode(fileTree))
  }

  // Update fileTree when files prop changes
  if (files !== fileTree && files.length > 0) {
    setFileTree(files)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Files</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {fileTree.map((node) => (
          <FileTreeItem
            key={node.id}
            node={node}
            level={0}
            onFileSelect={onFileSelect}
            activeFile={activeFile}
            onToggleExpand={handleToggleExpand}
          />
        ))}
      </div>
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Files</span>
          <span>Folders</span>
        </div>
      </div>
    </div>
  )
}
