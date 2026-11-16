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
import { OmnisButton, OmnisModuleHeader } from "@/components/ui/OmnisPrimitives";

interface ProviderStatus {
  id: string;
  name: string;
  endpoint: string;
  status: "operational" | "degraded" | "unreachable" | string;
  httpStatus?: number | null;
  latencyMs?: number;
  license: string;
}

function getProviderToneClass(status: string): string {
  if (status === "operational") return "badge-tone-verified";
  if (status === "degraded") return "badge-tone-warning";
  return "badge-tone-danger";
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

  const [emailInput, setEmailInput] = useState("analyst@institution.org");
  const [nameInput, setNameInput] = useState("Research Analyst");
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [overallHealthStatus, setOverallHealthStatus] = useState<string>("checking");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setActiveContext("Settings, Security & Data Governance", "System Configuration");
    fetch("/api/v1/health")
      .then((r) => (r.ok || r.status === 503 ? r.json() : null))
      .then((data) => {
        if (data?.providers) setProviders(data.providers);
        if (data?.status) setOverallHealthStatus(data.status);
      })
      .catch(() => {
        setOverallHealthStatus("unreachable");
      });
  }, [setActiveContext]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(emailInput, nameInput);
    setStatusMessage("Authenticated session established and workspace synced.");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <OmnisModuleHeader
        moduleTag="SYSTEM SETTINGS, VISUAL THEME & PRIVACY GOVERNANCE"
        title="Account Security, Theme Calibration & Data Provider Telemetry"
        subtitle="Calibrate Obsidian Dark (#05070C) vs Archival Pearl Light (#FAF8F5) interfaces, manage institutional sessions, and audit live upstream API providers."
        icon={<Settings className="w-3.5 h-3.5" />}
      />

      {statusMessage && (
        <div className="omnis-card p-4 border-[var(--status-verified)] text-[13.5px] sm:text-sm tone-verified flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theme Calibration */}
        <div className="omnis-card p-6 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Visual Theme Calibration</h2>
          <p className="text-[13.5px] sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Switch between OMNIS Obsidian Dark (#05070C) and Archival Pearl Light (#FAF8F5) themes.
            Both palettes are engineered for WCAG 2.2 AA contrast across charts, 3D overlays, and
            typography.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`p-4 rounded-xl border text-left space-y-1.5 transition-all cursor-pointer ${
                theme === "dark"
                  ? "bg-[var(--bg-elevated)] border-[var(--accent-blue)] ring-1 ring-[var(--accent-blue)]"
                  : "bg-[var(--bg-slate)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
              }`}
            >
              <div className="flex items-center gap-2 text-[13.5px] sm:text-sm font-bold text-[var(--text-primary)]">
                <Moon className="w-4 h-4 tone-blue shrink-0" />
                <span>Obsidian Dark (#05070C)</span>
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                Deep obsidian (#05070C) & precision cobalt blue
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`p-4 rounded-xl border text-left space-y-1.5 transition-all cursor-pointer ${
                theme === "light"
                  ? "bg-[var(--bg-elevated)] border-[var(--accent-blue)] ring-1 ring-[var(--accent-blue)]"
                  : "bg-[var(--bg-slate)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
              }`}
            >
              <div className="flex items-center gap-2 text-[13.5px] sm:text-sm font-bold text-[var(--text-primary)]">
                <Sun className="w-4 h-4 tone-warning shrink-0" />
                <span>Archival Pearl Light (#FAF8F5)</span>
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                High-contrast daylight archival surfaces (#FAF8F5)
              </div>
            </button>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
            <div className="text-[11.5px] font-mono uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Live Design Token Swatch Chips ({theme.toUpperCase()})
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { token: "--bg-obsidian", label: "Obsidian" },
                { token: "--bg-graphite", label: "Graphite" },
                { token: "--bg-slate", label: "Slate" },
                { token: "--accent-blue", label: "Accent Blue" },
                { token: "--status-cyan", label: "Accent Cyan" },
              ].map((swatch) => (
                <div
                  key={swatch.token}
                  className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-slate)] text-[11.5px] font-mono text-[var(--text-secondary)]"
                >
                  <span
                    aria-hidden="true"
                    className="w-3 h-3 rounded-full border border-[var(--border-strong)]"
                    style={{ backgroundColor: `var(${swatch.token})` }}
                  />
                  <span>{swatch.label}</span>
                  <span className="text-[var(--text-muted)]">{swatch.token}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Authentication & Session Management */}
        <div className="omnis-card p-6 space-y-4">
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <UserCheck className="w-4 h-4 tone-verified" />
            Researcher Authentication & Session
          </h2>

          {user && user.verified ? (
            <div className="space-y-3 text-[13.5px]">
              <div className="omnis-surface-slate p-3.5 space-y-1">
                <div className="font-bold text-base text-[var(--text-primary)]">{user.displayName}</div>
                <div className="text-[var(--text-secondary)] omnis-mono">{user.email}</div>
                <div className="text-xs tone-verified font-semibold pt-1">
                  ✓ Signed-In Session: {user.role} • Local Browser Workspace Active
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <OmnisButton variant="secondary" onClick={logout}>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </OmnisButton>
                <OmnisButton
                  variant="danger"
                  onClick={() => {
                    deleteAccountAndData();
                    setStatusMessage("Session signed out and local workspace data cleared.");
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Local Workspace Data</span>
                </OmnisButton>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-[13.5px]">
              {user && !user.verified && (
                <div className="omnis-surface-slate p-3 space-y-1 border-dashed">
                  <div className="font-bold text-[var(--text-primary)]">{user.displayName}</div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Role: {user.role} (Unverified guest workspace in `localStorage`)
                  </div>
                </div>
              )}
              <form onSubmit={handleLogin} className="space-y-3">
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Display Name"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-base md:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Institutional Email"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-base md:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <OmnisButton type="submit" className="flex-1">
                    Sign In / Set Local Researcher Profile
                  </OmnisButton>
                  {user && (
                    <OmnisButton
                      type="button"
                      variant="danger"
                      onClick={() => {
                        deleteAccountAndData();
                        setStatusMessage("Local workspace data cleared.");
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </OmnisButton>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Live External Data Provider Health Diagnostics */}
      <div className="omnis-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <Database className="w-4 h-4 tone-blue" />
            Centralised External Data Provider Telemetry
          </h2>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold omnis-mono uppercase ${
              overallHealthStatus === "operational"
                ? "badge-tone-verified"
                : overallHealthStatus === "checking"
                  ? "badge-tone-blue"
                  : overallHealthStatus === "degraded"
                    ? "badge-tone-warning"
                    : "badge-tone-danger"
            }`}
          >
            {overallHealthStatus === "operational"
              ? "All Providers Operational"
              : overallHealthStatus === "checking"
                ? "Probing Upstream APIs..."
                : `Status: ${overallHealthStatus}`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13.5px] sm:text-sm">
          {providers.map((p) => (
            <div key={p.id} className="omnis-surface-slate p-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[var(--text-primary)]">{p.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold omnis-mono uppercase ${getProviderToneClass(
                    p.status
                  )}`}
                >
                  {p.status}
                  {typeof p.latencyMs === "number" ? ` • ${p.latencyMs}ms` : ""}
                </span>
              </div>
              <div className="text-xs text-[var(--text-muted)] omnis-mono truncate">
                {p.endpoint}
                {typeof p.httpStatus === "number" ? ` (HTTP ${p.httpStatus})` : ""}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">License: {p.license}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Security & Privacy Policy Summary */}
      <div className="omnis-card p-6 space-y-2.5 text-[13.5px] sm:text-sm">
        <div className="flex items-center gap-2 text-xs font-bold tone-verified uppercase tracking-wider omnis-mono">
          <ShieldCheck className="w-4 h-4" />
          <span>Security, AI Guardrails & Privacy Disclosures</span>
        </div>
        <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
          OMNIS enforces strict input sanitization, prompt-injection detection, untrusted external
          document quarantine, and user-level workspace isolation. Private research reports,
          knowledge graphs, and saved collections are never sold or shared with third parties.
        </p>
      </div>
    </div>
  );
}
