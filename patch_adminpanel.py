#!/usr/bin/env python3
"""Round 39 AdminPanel additions: import-ad-tasks mutation+button, FundingTab, BotsTab."""
import re

path = "client/src/pages/AdminPanel.tsx"
src = open(path).read()

# 1. Import mutation hook after createTaskMutation (guarded)
marker = 'const createTaskMutation = useApiMutation("POST", "/api/admin/tasks", "Task created!");'
hook_code = """
  // Import ad-network task templates (Round 39)
  const { token: _tk } = useAuth();
  const [importing, setImporting] = useState(false);
  const importAdTasks = async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/admin/import-ad-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dryRun: false }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Import failed");
      toast.success((d.message || "Imported tasks") + (d.importedCount != null ? ` (${d.importedCount} new)` : ""));
      refreshTasks();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setImporting(false);
    }
  };
"""
if marker in src and "importAdTasks" not in src:
    src = src.replace(marker, marker + "\n" + hook_code)
    print("hook added")
else:
    print("hook skipped/guarded")

# 2. Add FundingTab and BotsTab components at the end of file
if "function FundingTab" not in src:
    funding_bots = '''

/* ---------- Funding Tab (Round 39): ad-network channels, ledger, import ---------- */
function FundingTab() {
  const { token } = useAuth();
  const authHeaders = { Authorization: `Bearer ${token}` };
  const { data, loading, refresh } = useApiFetch("/api/admin/funding");
  const { mutate: saveChannels, pending } = useApiMutation("PUT", "/api/admin/funding-channels", "Channels updated!");
  const [channels, setChannels] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);

  useEffect(() => {
    if (data?.channels) setChannels(data.channels);
    if (data?.ledger) setLedger(data.ledger);
  }, [data]);

  const updateChannel = (idx: number, patch: any) => {
    const next = channels.map((ch: any, i: number) => (i === idx ? { ...ch, ...patch } : ch));
    setChannels(next);
  };

  const importAdTasks = async () => {
    try {
      const res = await fetch("/api/admin/import-ad-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ dryRun: false }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Import failed");
      toast.success((d.message || "Imported tasks") + (d.importedCount != null ? ` (${d.importedCount} new)` : ""));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const enabledCount = channels.filter((c: any) => c.enabled).length;
  const totalRevenue = (ledger || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  return (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-primary" /> Ad-Network Channels
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Enable the ad networks you have accounts on. Task templates are imported from enabled channels.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>
          ) : (
            <div className="space-y-2">
              {channels.map((ch: any, idx: number) => (
                <div key={ch.network} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 border border-border/50 flex-wrap">
                  <span className="font-medium text-sm w-28">{ch.network}</span>
                  <input
                    className="flex-1 min-w-[180px] bg-background border border-border/50 rounded px-2 py-1 text-xs"
                    placeholder="Account ID / reference / link"
                    value={ch.accountId || ""}
                    onChange={(e) => updateChannel(idx, { accountId: e.target.value })}
                  />
                  <button
                    className={`px-3 py-1 rounded text-xs font-semibold border ${ch.enabled ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground border-border"}`}
                    onClick={() => updateChannel(idx, { enabled: !ch.enabled })}
                  >
                    {ch.enabled ? "ON" : "OFF"}
                  </button>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button size="sm" disabled={pending} onClick={() => saveChannels({ channels })} className="h-8 text-xs">
                  Save Channels
                </Button>
                <Button size="sm" variant="outline" disabled={enabledCount === 0} onClick={importAdTasks} className="h-8 text-xs border-emerald-500/30 text-emerald-600">
                  Import Ad-Network Tasks ({enabledCount} enabled)
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Funding Ledger</CardTitle>
          <p className="text-xs text-muted-foreground">Ad-network revenue credited to the platform.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-3 rounded-lg bg-primary/10"><p className="text-lg font-bold text-primary">${totalRevenue.toFixed(2)}</p><p className="text-[10px] text-muted-foreground">Total Revenue</p></div>
            <div className="p-3 rounded-lg bg-secondary/30"><p className="text-lg font-bold">{(ledger || []).length}</p><p className="text-[10px] text-muted-foreground">Entries</p></div>
          </div>
          {ledger && ledger.length > 0 ? (
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {ledger.map((e: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-secondary/20 text-xs">
                  <span className="font-medium">{e.network} — {e.type || "credit"}</span>
                  <span className="text-success font-semibold">+${Number(e.amount || 0).toFixed(4)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">No funding entries yet — revenue appears here when ad networks credit payouts.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Bots Tab (Round 39): simulated automation ---------- */
function BotsTab() {
  const { token } = useAuth();
  const authHeaders = { Authorization: `Bearer ${token}` };
  const { data, refresh } = useApiFetch("/api/admin/bots");
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState<any>({ count: 5, intervalHours: 1, rewardPerRun: 0.01, runTasks: true, runWithdraw: false, withdrawAmount: 1 });

  useEffect(() => {
    if (data?.config) setConfig((prev: any) => ({ ...prev, ...data.config }));
  }, [data]);

  const runAutomation = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/bots/run", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify(config) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Run failed");
      toast.success(`Bots ran: ${d.results || 0} task completions credited (self-deduct admin account).`);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveConfig = async () => {
    try {
      const res = await fetch("/api/admin/bots/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(config),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      toast.success("Bot config saved!");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const runLog = data?.runLog || [];
  const dedLog = data?.deductLog || [];

  return (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><MonitorPlay className="w-5 h-5 text-primary" /> Bot Automation</CardTitle>
          <p className="text-xs text-muted-foreground">Simulated workers: complete free tasks, credit your admin account, and optionally auto-withdraw.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2 rounded bg-secondary/30 text-xs">Runs today: <b>{data?.runsToday ?? 0}</b></div>
            <div className="p-2 rounded bg-secondary/30 text-xs">Total credited: <b>${Number(data?.totalCredited ?? 0).toFixed(4)}</b></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div><label className="text-muted-foreground">Bot count</label><input type="number" className="w-full bg-background border border-border/50 rounded px-2 py-1" value={config.count ?? 5} onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) || 1 })} /></div>
            <div><label className="text-muted-foreground">Interval (hrs)</label><input type="number" className="w-full bg-background border border-border/50 rounded px-2 py-1" value={config.intervalHours ?? 1} onChange={(e) => setConfig({ ...config, intervalHours: parseInt(e.target.value) || 1 })} /></div>
            <div><label className="text-muted-foreground">Reward per run ($)</label><input type="number" step="0.001" className="w-full bg-background border border-border/50 rounded px-2 py-1" value={config.rewardPerRun ?? 0.01} onChange={(e) => setConfig({ ...config, rewardPerRun: parseFloat(e.target.value) || 0 })} /></div>
            <div><label className="text-muted-foreground">Auto-withdraw ($)</label><input type="number" className="w-full bg-background border border-border/50 rounded px-2 py-1" value={config.withdrawAmount ?? 1} onChange={(e) => setConfig({ ...config, withdrawAmount: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" disabled={busy} onClick={runAutomation} className="h-8 text-xs">Run Automation</Button>
            <Button size="sm" variant="outline" onClick={saveConfig} className="h-8 text-xs">Save Config</Button>
            <label className="flex items-center gap-1 text-xs ml-2"><input type="checkbox" checked={!!config.runTasks} onChange={(e) => setConfig({ ...config, runTasks: e.target.checked })} /> Credit tasks</label>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!config.runWithdraw} onChange={(e) => setConfig({ ...config, runWithdraw: e.target.checked })} /> Auto-withdraw</label>
          </div>
          {(runLog.length > 0 || dedLog.length > 0) && (
            <div className="mt-3 max-h-44 overflow-y-auto space-y-1">
              {runLog.map((r: any, i: number) => (
                <div key={"r" + i} className="text-[11px] p-1.5 rounded bg-secondary/20">✔ ${(Number(r.amount || 0)).toFixed(4)} — {new Date(r.at || Date.now()).toLocaleString()}</div>
              ))}
              {dedLog.map((r: any, i: number) => (
                <div key={"d" + i} className="text-[11px] p-1.5 rounded bg-destructive/10 text-destructive">Self-deduct −${(Number(r.amount || 0)).toFixed(4)} — {new Date(r.at || Date.now()).toLocaleString()}</div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
'''
    src += funding_bots
    print("components added")

open(path, "w").write(src)
print("saved")
