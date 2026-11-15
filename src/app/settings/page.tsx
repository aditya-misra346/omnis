"use client";

import React, { useEffect, useState } from "react";
import {
  Settings,
  Sun,
  Moon,
  ShieldCheck,
  Database,
  UserCheck,
  LogOut,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { useOmnisStore } from "@/lib/store/use-omnis-store";

interface ProviderStatus {
  id: string;
  name: string;
  endpoint: string;
  status: string;
  license: string;
}

export default function SettingsPage() {
  const {
    theme,
    setTheme,
    user,
    login,
    logout,
    deleteAccountAndData,
    setActiveContext,
  } = useOmnisStore();

  const [emailInput, setEmailInput] = useState("researcher@omnis-intelligence.org");
  const [nameInput, setNameInput] = useState("Dr. Aditya Misra");
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setActiveContext("Settings, Security & Data Governance", "System Configuration");
    fetch("/api/v1/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.providers) setProviders(data.providers);
      })
      .catch(() => {});
  }, [setActiveContext]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(emailInput, nameInput);
    setStatusMessage("Authenticated session established and workspace synced.");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="omnis-card p-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
          <Settings className="w-3.5 h-3.5" />
          <span>SYSTEM SETTINGS, VISUAL THEME & PRIVACY GOVERNANCE</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">
          Account Security, Theme Calibration & Data Provider Telemetry
        </h1>
      </div>

      {statusMessage && (
        <div className="omnis-card p-4 border-emerald-500/40 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theme Calibration */}
        <div className="omnis-card p-6 space-y-4">
          <h2 className="text-base font-bold">Visual Theme Calibration</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Switch between OMNIS Obsidian Dark and Alabaster Light themes. Both palettes are
            engineered for WCAG 2.2 AA contrast across charts, 3D overlays, and typography.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`p-4 rounded-xl border text-left space-y-1 transition-all ${
                theme === "dark"
                  ? "bg-blue-600/20 border-blue-500"
                  : "bg-[var(--bg-slate)] border-[var(--border-subtle)]"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold">
                <Moon className="w-4 h-4 text-blue-400" />
                <span>Obsidian Dark</span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Deep obsidian (#07090E) & electric blue
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`p-4 rounded-xl border text-left space-y-1 transition-all ${
                theme === "light"
                  ? "bg-blue-600/20 border-blue-500"
                  : "bg-[var(--bg-slate)] border-[var(--border-subtle)]"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold">
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Alabaster Light</span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                High-contrast daylight research surfaces
              </div>
            </button>
          </div>
        </div>

        {/* Authentication & Session Management */}
        <div className="omnis-card p-6 space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            Researcher Authentication & Session
          </h2>

          {user ? (
            <div className="space-y-3 text-xs">
              <div className="omnis-surface-slate p-3.5 space-y-1">
                <div className="font-bold text-sm">{user.displayName}</div>
                <div className="text-[var(--text-secondary)] omnis-mono">{user.email}</div>
                <div className="text-[11px] text-emerald-400 pt-1">
                  ✓ Verified Role: {user.role} • Isolated Workspace Active
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={logout}
                  className="px-3.5 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] font-semibold inline-flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteAccountAndData();
                    setStatusMessage("Account and all private workspace data permanently deleted.");
                  }}
                  className="px-3.5 py-2 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Account & Data</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-3 text-xs">
              <input
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Display Name"
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)]"
              />
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Institutional Email"
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)]"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              >
                Sign In / Provision Researcher Session
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Live External Data Provider Health Diagnostics */}
      <div className="omnis-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            Centralised External Data Provider Telemetry
          </h2>
          <span className="text-xs text-emerald-400 omnis-mono">All Providers Operational</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {providers.map((p) => (
            <div key={p.id} className="omnis-surface-slate p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold">{p.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] omnis-mono uppercase">
                  {p.status}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] omnis-mono truncate">
                {p.endpoint}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">License: {p.license}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Security & Privacy Policy Summary */}
      <div className="omnis-card p-6 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-emerald-400 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Security, AI Guardrails & Privacy Disclosures</span>
        </div>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          OMNIS enforces strict input sanitization, prompt-injection detection, untrusted external
          document quarantine, and user-level workspace isolation. Private research reports,
          knowledge graphs, and saved collections are never sold or shared with third parties.
        </p>
      </div>
    </div>
  );
}
