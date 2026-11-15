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
import { OmnisButton, OmnisModuleHeader, OmnisSegmentedControl } from "@/components/ui/OmnisPrimitives";
import { OmnisSelect } from "@/components/ui/OmnisSelect";

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
    const ext = format;

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
      const folderCounts = filteredItems.reduce<Record<string, number>>((acc, item) => {
        acc[item.folder] = (acc[item.folder] ?? 0) + 1;
        return acc;
      }, {});
      const folderSummary = Object.entries(folderCounts)
        .map(([folder, count]) => `- **${folder}:** ${count} item${count === 1 ? "" : "s"}`)
        .join("\n");
      content = `# OMNIS Intelligence Executive Brief\n- **Generated:** ${new Date().toISOString()}\n- **Pinned Items:** ${filteredItems.length}\n\n## Folder Distribution\n${folderSummary || "- Empty selection"}\n\n---\n\n${filteredItems
        .map(
          (i, idx) =>
            `## ${String(idx + 1).padStart(2, "0")}. [${i.type.toUpperCase()}] ${i.title}\n- **Folder:** ${i.folder}\n- **Summary:** ${
              i.subtitle
            }\n- **Tags:** ${i.tags.join(", ")}\n- **Created:** ${i.createdAt}\n`
        )
        .join("\n")}`;
    }

    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      ext === "md"
        ? `omnis-workspace-brief-${new Date().toISOString().slice(0, 10)}.md`
        : `omnis-workspace-export.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Report/Export Centre */}
      <OmnisModuleHeader
        moduleTag="PERSONAL RESEARCH WORKSPACE & MULTI-FORMAT EXPORT CENTRE"
        title="Collections, Saved Reports, Graphs, Simulations & Notes"
        subtitle="Organise saved country dossiers, deep research reports, causal graphs, and laboratory annotations with clean Markdown, CSV, JSON, and print-ready exports."
        icon={<Briefcase className="w-3.5 h-3.5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2 no-print">
            <OmnisButton onClick={() => handleExportFormat("md")}>
              <Download className="w-3.5 h-3.5" />
              <span>Export Markdown Brief (.md)</span>
            </OmnisButton>
            <OmnisButton variant="secondary" onClick={() => handleExportFormat("csv")}>
              <Download className="w-3.5 h-3.5 tone-verified" />
              <span>Export CSV</span>
            </OmnisButton>
            <OmnisButton variant="secondary" onClick={() => handleExportFormat("json")}>
              <Download className="w-3.5 h-3.5 tone-blue" />
              <span>Export JSON</span>
            </OmnisButton>
            <OmnisButton variant="secondary" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5 tone-violet" />
              <span>Print / PDF</span>
            </OmnisButton>
          </div>
        }
      >
        {/* Folder & Type Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <OmnisSegmentedControl
            value={selectedFolder}
            onChange={setSelectedFolder}
            groupId="workspace-folder-tabs"
            ariaLabel="Filter workspace by folder"
            size="sm"
            options={["ALL", ...folders].map((f) => ({
              value: f,
              label: f,
            }))}
          />

          <div className="flex flex-wrap items-center gap-2">
            <OmnisSelect
              value={selectedType}
              onChange={setSelectedType}
              ariaLabel="Filter by Item Type"
              options={[
                { value: "ALL", label: "All Item Types" },
                { value: "country", label: "Countries" },
                { value: "report", label: "Research Reports" },
                { value: "graph", label: "Knowledge Graphs" },
                { value: "simulation", label: "Simulations" },
                { value: "timeline", label: "Timeline Events" },
                { value: "lab", label: "Lab Experiments" },
                { value: "note", label: "Research Notes" },
              ]}
            />

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)]">
              <Search className="w-3.5 h-3.5 tone-blue" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Search workspace..."
                className="bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none w-36"
              />
            </div>
          </div>
        </div>
      </OmnisModuleHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Saved Items Grid */}
        <div className="lg:col-span-8 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="omnis-card p-8 text-center text-sm text-[var(--text-secondary)]">
              No saved items match your current filter. Explore any module and click Save to populate
              your workspace.
            </div>
          ) : (
            filteredItems.map((item: WorkspaceSavedItem) => (
              <div
                key={item.id}
                className="omnis-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[var(--border-strong)] transition-all"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] omnis-mono">
                    <span className="px-2 py-0.5 rounded-md badge-tone-blue uppercase font-bold">
                      {item.type}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                      Folder: {item.folder}
                    </span>
                    <span className="text-[var(--text-muted)]">{item.createdAt.slice(0, 10)}</span>
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">{item.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{item.subtitle}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[var(--text-muted)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <Link
                    href={item.href}
                    className="px-3 py-1.5 rounded-lg badge-tone-blue hover:brightness-105 text-xs font-semibold inline-flex items-center gap-1 transition-all"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeWorkspaceItem(item.id)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:tone-danger cursor-pointer"
                    title="Delete Item"
                    aria-label={`Delete ${item.title}`}
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
            <h2 className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
              <FileText className="w-4 h-4 tone-blue" />
              Create Research Note or Bookmark
            </h2>
            <input
              type="text"
              required
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Note title or hypothesis..."
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)]"
            />
            <textarea
              rows={3}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Observations, citations, or follow-up questions..."
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)]"
            />
            <OmnisSelect
              value={noteFolder}
              onChange={setNoteFolder}
              ariaLabel="Select Note Folder"
              fullWidth
              size="md"
              options={folders.map((f) => ({
                value: f,
                label: `Folder: ${f}`,
              }))}
            />
            <OmnisButton type="submit" className="w-full">
              <Plus className="w-3.5 h-3.5" />
              <span>Save Note to Workspace</span>
            </OmnisButton>
          </form>

          <div className="omnis-card p-5 space-y-3 text-xs">
            <h2 className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
              <FolderPlus className="w-4 h-4 tone-violet" />
              Create Collection Folder
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder name..."
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)]"
              />
              <OmnisButton
                type="button"
                onClick={() => {
                  addFolder(newFolderName);
                  setNewFolderName("");
                }}
              >
                Add
              </OmnisButton>
            </div>
            <div className="pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={clearWorkspace}
                className="tone-danger hover:underline font-semibold cursor-pointer"
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
