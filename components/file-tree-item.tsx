"use client"
import { Button } from "@/components/ui/button"
import { ChevronRight, FileIcon } from "lucide-react"
import type { FileNode } from "@/app/page"

interface FileTreeItemProps {
  node: FileNode
  level: number
  onFileSelect: (file: FileNode) => void
  activeFile: FileNode | null
  onToggleExpand: (nodeId: string) => void
  gitStatus?: { added: number; deleted: number }
}

export default function FileTreeItem({
  node,
  level,
  onFileSelect,
  activeFile,
  onToggleExpand,
  gitStatus,
}: FileTreeItemProps) {
  const isActive = activeFile?.id === node.id
  const isExpanded = node.isExpanded

  const handleClick = () => {
    if (node.type === "folder") {
      onToggleExpand(node.id)
    } else {
      onFileSelect(node)
    }
  }

  return (
    <div className="flex flex-col gap-0">
      <li>
        <Button
          variant="ghost"
          size="sm"
          className={`mb-0 h-[26px] w-full min-w-36 justify-between gap-2 pl-0.5 pr-1 rounded-lg ${
            isActive ? "bg-gray-200" : "hover:bg-gray-200"
          }`}
          onClick={handleClick}
          data-active={isActive}
          title={node.name}
        >
          <div className="flex min-w-0 items-center gap-1">
            <div className="p-0.5 text-gray-500 group-focus:text-gray-900 group-[[data-active=true]]:text-gray-900">
              {node.type === "folder" ? (
                <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              ) : (
                <FileIcon className="h-4 w-4" />
              )}
            </div>
            <span className="truncate font-normal">{node.name}</span>
          </div>
          {gitStatus && node.type === "file" && (
            <div className="flex items-center gap-0.5 text-xs text-gray-500">
              <div className="text-green-700">+{gitStatus.added}</div>
              <div>/</div>
              <div className="text-red-700">-{gitStatus.deleted}</div>
            </div>
          )}
        </Button>
      </li>

      {node.type === "folder" && isExpanded && node.children && (
        <div className="border-alpha-400 group-hover:border-l-alpha-400 duration-250 ml-3 flex min-w-0 translate-x-[0.5px] flex-col border-l border-l-transparent pl-1 transition-colors">
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              activeFile={activeFile}
              onToggleExpand={onToggleExpand}
              gitStatus={
                child.id === "2"
                  ? { added: 8, deleted: 3 }
                  : child.id === "chat-panel"
                    ? { added: 18, deleted: 7 }
                    : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
