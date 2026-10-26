export type SkeletonView = "decision" | "accuracy" | "comparison";
function Bone({ kind = "line" }: { kind?: string }) {
  return <div className={`skeleton-bone skeleton-${kind}`} />;
}
function Plot({ compact = false }: { compact?: boolean }) {
  return <div className={`skeleton-plot ${compact ? "skeleton-plot-compact" : ""}`}><Bone kind="axis" /><div className="skeleton-grid">{[0,1,2,3].map(i => <div key={i} />)}</div><Bone kind="ticks" /></div>;
}
function Panel({ compact = false }: { compact?: boolean }) {
  return <div className="chart-panel"><div className="panel-heading"><div><Bone kind="title" /><Bone /></div></div><Plot compact={compact} /><div className="chart-bottom"><Bone /><Bone kind="short" /></div></div>;
}
export function DashboardSkeleton({ view = "decision", fullPage = false }: { view?: SkeletonView; fullPage?: boolean }) {
  const accuracy = view === "accuracy";
  return <div className="dashboard-skeleton" role="status" aria-label="Loading Elexon data" aria-busy="true">
    <span className="skeleton-sr-only">Loading stored Elexon observations.</span>
    <div aria-hidden="true">
      {fullPage && <><div className="page-title"><div><Bone kind="headline" /><Bone kind="headline" /><Bone kind="description" /></div></div><div className="controls">{[0,1,2].map(i => <div className="field" key={i}><Bone kind="short" /><Bone kind="input" /></div>)}<Bone kind="button" /></div><div className="control-caption"><Bone /></div></>}
      {view === "comparison" ? <><Plot /><div className="chart-bottom"><Bone /><Bone kind="short" /></div><div className="table-details"><Bone /></div></> : <>
        {fullPage && accuracy && <Bone kind="notice" />}
        <div className="section-line"><Bone /><Bone kind="short" /></div>
        <div className={`stats ${accuracy ? "accuracy-stats" : ""}`}>{Array.from({length: accuracy ? 4 : 3}, (_, i) => <div className="stat" key={i}><Bone kind="short" /><Bone kind="metric" /><Bone /></div>)}</div>
        {accuracy ? <><Panel /><div className="accuracy-bottom"><Panel compact /><div className="reading-note"><Bone kind="title" /><Bone /><Bone /><Bone kind="metric" /></div></div></> : <div className="decision-grid"><Panel /><aside className="publication"><Bone kind="title" /><Bone />{[0,1,2].map(i => <div className="skeleton-publication-row" key={i}><Bone kind="short" /><Bone /><Bone kind="short" /></div>)}<Bone /><Bone /></aside></div>}
        <div className="table-details"><Bone /></div>
      </>}
    </div>
  </div>;
}
