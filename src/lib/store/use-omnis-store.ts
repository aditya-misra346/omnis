"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WorkspaceSavedItem {
  id: string;
  type:
    | "country"
    | "report"
    | "graph"
    | "timeline"
    | "simulation"
    | "lab"
    | "bookmark"
    | "note";
  title: string;
  subtitle: string;
  folder: string;
  tags: string[];
  createdAt: string;
  href: string;
  payload?: Record<string, unknown>;
}

export interface CommandWidgetConfig {
  id: string;
  title: string;
  visible: boolean;
  order: number;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: { label: string; url: string }[];
  suggestedActions?: { label: string; href: string }[];
}

export interface OmnisUser {
  id: string;
  email: string;
  displayName: string;
  role: "Principal Researcher" | "Policy Analyst" | "Student Explorer";
  verified: boolean;
  createdAt: string;
}

interface OmnisState {
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;

  motionPaused: boolean;
  setMotionPaused: (paused: boolean) => void;
  toggleMotionPaused: () => void;

  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
  activeContextLabel: string;
  activeContextTopic: string;
  setActiveContext: (label: string, topic: string) => void;
  assistantMessages: AssistantMessage[];
  addAssistantMessage: (msg: AssistantMessage) => void;
  clearAssistantMessages: () => void;

  user: OmnisUser | null;
  login: (email: string, displayName?: string) => void;
  logout: () => void;
  deleteAccountAndData: () => void;

  followedTopics: string[];
  toggleFollowedTopic: (topic: string) => void;

  searchHistory: string[];
  savedSearches: string[];
  addSearchQuery: (q: string) => void;
  toggleSavedSearch: (q: string) => void;
  clearSearchHistory: () => void;

  widgets: CommandWidgetConfig[];
  toggleWidgetVisibility: (id: string) => void;
  moveWidget: (id: string, direction: "up" | "down") => void;
  resetWidgets: () => void;

  workspaceItems: WorkspaceSavedItem[];
  folders: string[];
  addWorkspaceItem: (item: Omit<WorkspaceSavedItem, "id" | "createdAt">) => void;
  updateWorkspaceItem: (id: string, updates: Partial<WorkspaceSavedItem>) => void;
  removeWorkspaceItem: (id: string) => void;
  addFolder: (folder: string) => void;
  clearWorkspace: () => void;
}

const DEFAULT_WIDGETS: CommandWidgetConfig[] = [
  { id: "trending-global", title: "Live Global Macroeconomic & Research Signals", visible: true, order: 0 },
  { id: "flagship-modules", title: "Six Flagship Intelligence Modules", visible: true, order: 1 },
  { id: "global-developments", title: "Verified Global Developments & Briefings", visible: true, order: 2 },
  { id: "recent-explorations", title: "Recently Explored Subjects & Saved Workspace", visible: true, order: 3 },
  { id: "recommended-paths", title: "Recommended Cross-Disciplinary Explorations", visible: true, order: 4 },
];

const INITIAL_WORKSPACE_ITEMS: WorkspaceSavedItem[] = [
  {
    id: "ws-init-india",
    type: "country",
    title: "India (IND) — Sovereign Country Intelligence",
    subtitle: "GDP $3,912.6B • +6.8% Real Growth • World Bank & RBI Series",
    folder: "Geopolitics & Macro",
    tags: ["India", "G20", "Macroeconomics", "DPI"],
    createdAt: "2026-11-15T08:00:00Z",
    href: "/atlas?country=IND",
  },
  {
    id: "ws-init-graph",
    type: "graph",
    title: "Artificial Intelligence & Semiconductor Supply Chain Graph",
    subtitle: "10 Entities • 9 Typed Semantic Relationships • Force-Directed",
    folder: "Technology & Compute",
    tags: ["AI", "Semiconductors", "EUV", "Knowledge Graph"],
    createdAt: "2026-11-15T08:15:00Z",
    href: "/knowledge-graph?topic=Artificial%20Intelligence",
  },
  {
    id: "ws-init-sim",
    type: "simulation",
    title: "Global Oil Price Shock (+30%) & Monetary Transmission Run",
    subtitle: "500-Path Monte Carlo • 15-Year Horizon • Solow-Swan MDSE-v2.4",
    folder: "Scenario Simulations",
    tags: ["Simulation", "Oil Shock", "Inflation", "Monte Carlo"],
    createdAt: "2026-11-15T08:25:00Z",
    href: "/simulations?category=economics",
  },
  {
    id: "ws-init-report",
    type: "report",
    title: "India's Economic Development Since 1991 Liberalisation",
    subtitle: "Deep Research Synthesis • OpenAlex + World Bank WDI Citations",
    folder: "Geopolitics & Macro",
    tags: ["Research Report", "1991 Reforms", "Citations"],
    createdAt: "2026-11-15T08:30:00Z",
    href: "/research?q=Explain%20India%27s%20economic%20development%20since%201991",
  },
];

export const useOmnisStore = create<OmnisState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),

      motionPaused: false,
      setMotionPaused: (motionPaused) => set({ motionPaused }),
      toggleMotionPaused: () =>
        set((state) => ({ motionPaused: !state.motionPaused })),

      sidebarCollapsed: false,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      commandPaletteOpen: false,
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),

      assistantOpen: false,
      setAssistantOpen: (assistantOpen) => set({ assistantOpen }),
      activeContextLabel: "Intelligence Command Center",
      activeContextTopic: "Global Macroeconomic & Scientific Overview",
      setActiveContext: (activeContextLabel, activeContextTopic) =>
        set({ activeContextLabel, activeContextTopic }),
      assistantMessages: [
        {
          id: "msg-welcome",
          role: "assistant",
          content:
            "Welcome to OMNIS Universal Intelligence Assistant. I am context-aware of your active page, country profile, knowledge graph, or simulation parameters. Ask me to explain any indicator, compare entities, generate a knowledge graph, or synthesize source-backed research.",
          timestamp: "2026-11-15T08:00:00Z",
          citations: [
            { label: "World Bank Open Data API v2", url: "https://data.worldbank.org" },
            { label: "OpenAlex Scholarly Graph", url: "https://openalex.org" },
          ],
          suggestedActions: [
            { label: "Inspect India Country Profile", href: "/atlas?country=IND" },
            { label: "Compare India vs China", href: "/intelligence?left=IND&right=CHN" },
            { label: "Open AI Knowledge Graph", href: "/knowledge-graph?topic=Artificial%20Intelligence" },
          ],
        },
      ],
      addAssistantMessage: (msg) =>
        set((state) => ({ assistantMessages: [...state.assistantMessages, msg] })),
      clearAssistantMessages: () =>
        set({
          assistantMessages: [
            {
              id: "msg-reset",
              role: "assistant",
              content: "Conversation history cleared. Ready for your next inquiry.",
              timestamp: new Date().toISOString(),
            },
          ],
        }),

      user: {
        id: "usr-omnis-01",
        email: "researcher@omnis-intelligence.org",
        displayName: "Dr. Aditya Misra",
        role: "Principal Researcher",
        verified: true,
        createdAt: "2026-11-15T00:00:00Z",
      },
      login: (email, displayName) =>
        set({
          user: {
            id: `usr-${Date.now()}`,
            email,
            displayName: displayName || email.split("@")[0] || "Researcher",
            role: "Principal Researcher",
            verified: true,
            createdAt: new Date().toISOString(),
          },
        }),
      logout: () => set({ user: null }),
      deleteAccountAndData: () =>
        set({
          user: null,
          workspaceItems: [],
          searchHistory: [],
          savedSearches: [],
          followedTopics: ["Artificial Intelligence", "Indian Economy"],
        }),

      followedTopics: [
        "Artificial Intelligence",
        "Indian Economy",
        "Semiconductor Industry",
        "Climate Change & Clean Energy",
        "Global Geopolitics",
        "Space Exploration",
      ],
      toggleFollowedTopic: (topic) =>
        set((state) => ({
          followedTopics: state.followedTopics.includes(topic)
            ? state.followedTopics.filter((t) => t !== topic)
            : [...state.followedTopics, topic],
        })),

      searchHistory: [
        "Explain India's economic development since 1991",
        "Compare India and China economically",
        "How are semiconductor manufacturing and geopolitics connected?",
        "How does artificial intelligence affect employment?",
      ],
      savedSearches: [
        "Explain India's economic development since 1991",
        "How are semiconductor manufacturing and geopolitics connected?",
      ],
      addSearchQuery: (q) =>
        set((state) => {
          const clean = q.trim();
          if (!clean) return state;
          const next = [clean, ...state.searchHistory.filter((item) => item !== clean)].slice(0, 15);
          return { searchHistory: next };
        }),
      toggleSavedSearch: (q) =>
        set((state) => ({
          savedSearches: state.savedSearches.includes(q)
            ? state.savedSearches.filter((item) => item !== q)
            : [q, ...state.savedSearches],
        })),
      clearSearchHistory: () => set({ searchHistory: [] }),

      widgets: DEFAULT_WIDGETS,
      toggleWidgetVisibility: (id) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, visible: !w.visible } : w
          ),
        })),
      moveWidget: (id, direction) =>
        set((state) => {
          const sorted = [...state.widgets].sort((a, b) => a.order - b.order);
          const idx = sorted.findIndex((w) => w.id === id);
          if (idx === -1) return state;
          const swapIdx = direction === "up" ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= sorted.length) return state;
          const temp = sorted[idx].order;
          sorted[idx] = { ...sorted[idx], order: sorted[swapIdx].order };
          sorted[swapIdx] = { ...sorted[swapIdx], order: temp };
          return { widgets: sorted.sort((a, b) => a.order - b.order) };
        }),
      resetWidgets: () => set({ widgets: DEFAULT_WIDGETS }),

      workspaceItems: INITIAL_WORKSPACE_ITEMS,
      folders: ["General", "Geopolitics & Macro", "Technology & Compute", "Scenario Simulations"],
      addWorkspaceItem: (item) =>
        set((state) => {
          const exists = state.workspaceItems.some(
            (existing) => existing.title === item.title && existing.type === item.type
          );
          if (exists) return state;
          return {
            workspaceItems: [
              {
                ...item,
                id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                createdAt: new Date().toISOString(),
              },
              ...state.workspaceItems,
            ],
          };
        }),
      updateWorkspaceItem: (id, updates) =>
        set((state) => ({
          workspaceItems: state.workspaceItems.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        })),
      removeWorkspaceItem: (id) =>
        set((state) => ({
          workspaceItems: state.workspaceItems.filter((item) => item.id !== id),
        })),
      addFolder: (folder) =>
        set((state) => {
          const clean = folder.trim();
          if (!clean || state.folders.includes(clean)) return state;
          return { folders: [...state.folders, clean] };
        }),
      clearWorkspace: () => set({ workspaceItems: [] }),
    }),
    {
      name: "omnis-intelligence-workspace-v1",
    }
  )
);
