# Contributing to OMNIS (`CONTRIBUTING.md`)

## Engineering Standards

1. **Epistemic Integrity**: Never hardcode fabricated statistics or fake citations. Always attach a `ProvenanceRecord` with source, publisher, units, date, and methodology.
2. **Type Safety**: Maintain zero TypeScript errors (`npm run typecheck`) and strict Pydantic/Zod schemas.
3. **Conventional Commits**:
   - `feat:` for new intelligence modules or capabilities
   - `fix:` for bug fixes
   - `perf:` for 3D WebGL, D3 graph, or query optimisations
   - `ui:` for design system and theme refinements
   - `security:` for authentication, validation, or guardrail improvements
   - `docs:` for architectural and API documentation updates
4. **Pre-Push Verification Checklist**:
   - `npm run typecheck`
   - `npm test`
   - `npm run test:backend`
   - `npm run build`
