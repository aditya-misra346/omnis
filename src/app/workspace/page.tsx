"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  FolderPlus,
  Plus,
  Trash2,
  Download,
  Printer,
  Search,
  ExternalLink,
  FileText,
} from "lucide-react";
import { useOmnisStore, type WorkspaceSavedItem } from "@/lib/store/use-omnis-store";

export default function WorkspacePage() {
  const {
    workspaceItems,
    folders,
    addWorkspaceItem,
    removeWorkspaceItem,
    addFolder,
    clearWorkspace,
    setActiveContext,
  } = useOmnisStore();

  const [selectedFolder, setSelectedFolder] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [filterText, setFilterText] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteFolder, setNoteFolder] = useState("General");

  useEffect(() => {
    setActiveContext("My Workspace & Export Centre", `${workspaceItems.length} Saved Items`);
  }, [workspaceItems.length, setActiveContext]);

  const filteredItems = useMemo(() => {
    return workspaceItems.filter((item) => {
      if (selectedFolder !== "ALL" && item.folder !== selectedFolder) return false;
      if (selectedType !== "ALL" && item.type !== selectedType) return false;
      if (
        filterText.trim() &&
        !`${item.title} ${item.subtitle} ${item.tags.join(" ")}`
          .toLowerCase()
          .includes(filterText.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [workspaceItems, selectedFolder, selectedType, filterText]);

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;
    addWorkspaceItem({
      type: "note",
      title: noteTitle.trim(),
      subtitle: noteBody.trim() || "Research annotation saved in OMNIS Workspace.",
      folder: noteFolder,
      tags: ["Research Note", noteFolder],
      href: "/workspace",
    });
    setNoteTitle("");
    setNoteBody("");
  };

  const handleExportFormat = (format: "json" | "csv" | "md") => {
    let content = "";
    let mime = "application/json";
    let ext = format;

    if (format === "json") {
      content = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          platform: "OMNIS — The Intelligence of Everything",
          count: filteredItems.length,
          items: filteredItems,
        },
        null,
        2
      );
    } else if (format === "csv") {
      mime = "text/csv";
      const header = "ID,Type,Folder,Title,Subtitle,CreatedAt,Href";
      const rows = filteredItems.map((i) =>
        [
          i.id,
          i.type,
          `"${i.folder}"`,
          `"${i.title.replace(/"/g, '""')}"`,
          `"${i.subtitle.replace(/"/g, '""')}"`,
          i.createdAt,
          i.href,
        ].join(",")
      );
      content = [header, ...rows].join("\n");
    } else {
      mime = "text/markdown";
      content = `# OMNIS Workspace Research Export\nExported: ${new Date().toISOString()}\n\n${filteredItems
        .map(
          (i) =>
            `## [${i.type.toUpperCase()}] ${i.title}\n- **Folder:** ${i.folder}\n- **Summary:** ${
              i.subtitle
            }\n- **Tags:** ${i.tags.join(", ")}\n- **Created:** ${i.createdAt}\n`
        )
        .join("\n")}`;
    }

    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omnis-workspace-export.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Report/Export Centre */}
      <div className="omnis-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <Briefcase className="w-3.5 h-3.5" />
              <span>PERSONAL RESEARCH WORKSPACE & MULTI-FORMAT EXPORT CENTRE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">
              Collections, Saved Reports, Graphs, Simulations & Notes
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              type="button"
              onClick={() => handleExportFormat("md")}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Markdown</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportFormat("csv")}
              className="px-3 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportFormat("json")}
              className="px-3 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-violet-400" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Folder & Type Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {["ALL", ...folders].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setSelectedFolder(f)}
                className={`px-3 py-1.5 rounded-lg font-medium ${
                  selectedFolder === f
                    ? "bg-blue-600 text-white"
                    : "bg-[var(--bg-slate)] text-[var(--text-secondary)]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              aria-label="Filter by Item Type"
              className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)]"
            >
              <option value="ALL">All Item Types</option>
              <option value="country">Countries</option>
              <option value="report">Research Reports</option>
              <option value="graph">Knowledge Graphs</option>
              <option value="simulation">Simulations</option>
              <option value="timeline">Timeline Events</option>
              <option value="lab">Lab Experiments</option>
              <option value="note">Research Notes</option>
            </select>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)]">
              <Search className="w-3.5 h-3.5 text-blue-400" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Search workspace..."
                className="bg-transparent focus:outline-none w-36"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Saved Items Grid */}
        <div className="lg:col-span-8 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="omnis-card p-8 text-center text-sm text-[var(--text-muted)]">
              No saved items match your current filter. Explore any module and click Save to populate
              your workspace.
            </div>
          ) : (
            filteredItems.map((item: WorkspaceSavedItem) => (
              <div
                key={item.id}
                className="omnis-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-500/40 transition-all"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] omnis-mono">
                    <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 uppercase font-bold">
                      {item.type}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[var(--bg-slate)] text-[var(--text-secondary)]">
                      Folder: {item.folder}
                    </span>
                    <span className="text-[var(--text-muted)]">{item.createdAt.slice(0, 10)}</span>
                  </div>
                  <h3 className="text-base font-bold">{item.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{item.subtitle}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-slate)] text-[var(--text-muted)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <Link
                    href={item.href}
                    className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeWorkspaceItem(item.id)}
                    className="p-1.5 rounded text-[var(--text-muted)] hover:text-rose-400"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Sidebar: Add Research Note & Manage Collections */}
        <div className="lg:col-span-4 space-y-6">
          <form onSubmit={handleCreateNote} className="omnis-card p-5 space-y-3 text-xs">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Create Research Note or Bookmark
            </h2>
            <input
              type="text"
              required
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Note title or hypothesis..."
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)]"
            />
            <textarea
              rows={3}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Observations, citations, or follow-up questions..."
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)]"
            />
            <select
              value={noteFolder}
              onChange={(e) => setNoteFolder(e.target.value)}
              aria-label="Select Note Folder"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)]"
            >
              {folders.map((f) => (
                <option key={f} value={f} className="bg-[var(--bg-graphite)]">
                  Folder: {f}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Note to Workspace</span>
            </button>
          </form>

          <div className="omnis-card p-5 space-y-3 text-xs">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-violet-400" />
              Create Collection Folder
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder name..."
                className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)]"
              />
              <button
                type="button"
                onClick={() => {
                  addFolder(newFolderName);
                  setNewFolderName("");
                }}
                className="px-3.5 py-2 rounded-lg bg-blue-600 text-white font-semibold"
              >
                Add
              </button>
            </div>
            <div className="pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={clearWorkspace}
                className="text-rose-400 hover:underline font-medium"
              >
                Clear All Saved Workspace Items
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
