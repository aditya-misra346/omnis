import Link from "next/link";
import { Compass, Globe2, Home, FileSearch } from "lucide-react";
import { OmnisMark } from "@/components/brand/OmnisLogo";

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-14">
      <div className="w-full max-w-xl omnis-card p-6 sm:p-8 space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-2xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] inline-flex items-center justify-center">
            <OmnisMark size={44} />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] tone-blue omnis-mono">
            HTTP 404 • Coordinate Outside Indexed Ontology
          </div>
          <h1 className="omnis-display-section text-[var(--text-primary)] font-bold">
            Route Not Found in Global Index
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
            The requested intelligence coordinate does not exist or has moved. Return to the
            live planetary workbench or launch a verified module directly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
          <Link
            href="/"
            className="group p-3.5 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2.5">
              <Home className="w-4 h-4 tone-blue shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Executive Landing
                </div>
                <div className="text-[11px] text-[var(--text-muted)] omnis-mono">/</div>
              </div>
            </div>
            <span className="omnis-magnetic-arrow text-xs tone-blue">→</span>
          </Link>

          <Link
            href="/atlas"
            className="group p-3.5 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2.5">
              <Globe2 className="w-4 h-4 tone-blue shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  3D Global Atlas
                </div>
                <div className="text-[11px] text-[var(--text-muted)] omnis-mono">/atlas</div>
              </div>
            </div>
            <span className="omnis-magnetic-arrow text-xs tone-blue">→</span>
          </Link>

          <Link
            href="/research"
            className="group p-3.5 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2.5">
              <FileSearch className="w-4 h-4 tone-blue shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Deep Research Engine
                </div>
                <div className="text-[11px] text-[var(--text-muted)] omnis-mono">/research</div>
              </div>
            </div>
            <span className="omnis-magnetic-arrow text-xs tone-blue">→</span>
          </Link>

          <Link
            href="/explore"
            className="group p-3.5 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2.5">
              <Compass className="w-4 h-4 tone-blue shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Semantic Explorer
                </div>
                <div className="text-[11px] text-[var(--text-muted)] omnis-mono">/explore</div>
              </div>
            </div>
            <span className="omnis-magnetic-arrow text-xs tone-blue">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
