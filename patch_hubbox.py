#!/usr/bin/env python3
"""Round 40: add UserHubBox component before AdminPanel default export."""
import re

PATH = "client/src/pages/AdminPanel.tsx"
src = open(PATH).read()

# Guard
marker = "function UserHubBox("
if marker in src:
    print("UserHubBox already added, skipping")
else:
    # Find end of imports of lucide-react (CircleDollarSign,}) to add Activity icon
    src = src.replace(
        "  CircleDollarSign,\n} from \"lucide-react\";",
        "  CircleDollarSign,\n  Activity,\n} from \"lucide-react\";",
        1,
    )

    component = '''
/* Round 40: Notifications Hub — per-user activity box with A–Z actions */
function UserHubBox({ user, onEdit, onDeleteNotification, onRefresh }: { user: any; onEdit: (id: number, fields: Record<string, any>) => Promise<void>; onDeleteNotification: (id: number) => Promise<void>; onRefresh: () => void }) {
  const items = user.items || [];
  const [topUpAmt, setTopUpAmt] = useState("");
  const [topupBusy, setTopupBusy] = useState(false);
  const name = user.userName || user.userEmail || "Unknown User";
  const statusColor = user.status === "suspended" ? "border-destructive/40 bg-destructive/5" : "border-border/60 bg-secondary/10";
  return (
    <div className={`rounded-xl border ${statusColor} p-3`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Activity className="w-4 h-4 text-primary" /></span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user.userEmail || ""} {user.userPhone ? `· ${user.userPhone}` : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">{user.role || "user"}</Badge>
          <Badge variant="outline" className={`text-[10px] ${user.status === "suspended" ? "border-destructive/30 text-destructive" : "border-chart-2/30 text-chart-2"}`}>{user.status || "active"}</Badge>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">Balance: <b className="text-foreground">${Number(user.balance || 0).toFixed(2)}</b> · Earned: <b className="text-foreground">${Number(user.totalEarned || 0).toFixed(2)}</b></span>
        </div>
      </div>
      <div className="mt-2 flex gap-1.5 flex-wrap">
        <Button size="sm" variant="outline" className="h-7 text-[10px] border-chart-2/30 text-chart-2 hover:bg-chart-2/10" onClick={() => void onEdit(user.userId, { is_banned: false, status: "active" })} disabled={user.status === "active"}>Approve / Activate</Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px] border-warning/30 text-warning hover:bg-warning/10" onClick={() => { if (confirm("Suspend this user?")) void onEdit(user.userId, { is_banned: true, status: "suspended" }); }}>Suspend</Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px] border-primary/20 text-primary hover:bg-primary/10" onClick={() => void onEdit(user.userId, { role: user.role === "admin" ? "user" : "admin" })}>{user.role === "admin" ? "Demote to User" : "Promote to Admin"}</Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-[10px] border-primary/20 text-primary hover:bg-primary/10"><Plus className="w-3 h-3 mr-1" /> Credit</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[340px]">
            <DialogHeader><DialogTitle className="text-sm">Credit {name}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-1">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-primary/20 text-primary" onClick={() => void onEdit(user.userId, { available_balance: (Number(user.balance || 0) + 10).toFixed(4) })}>+ $10</Button>
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-primary/20 text-primary" onClick={() => void onEdit(user.userId, { available_balance: (Number(user.balance || 0) + 50).toFixed(4) })}>+ $50</Button>
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-primary/20 text-primary" onClick={() => void onEdit(user.userId, { available_balance: (Number(user.balance || 0) + 100).toFixed(4) })}>+ $100</Button>
              </div>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span><Input type="number" step="0.01" min="0.01" placeholder="Custom" value={topUpAmt} onChange={(e) => setTopUpAmt(e.target.value)} className="pl-6 h-9" /></div>
                <Button disabled={topupBusy} onClick={() => { const a = parseFloat(topUpAmt); if (!a || a <= 0) { toast.error("Enter amount"); return; } void onEdit(user.userId, { available_balance: (Number(user.balance || 0) + a).toFixed(4) }).then(() => setTopUpAmt("")); }} className="h-9 shrink-0">Add</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Button size="sm" variant="outline" className="h-7 text-[10px] border-muted/30 text-muted-foreground" onClick={() => { if (confirm("Reset this user's login password?")) void onEdit(user.userId, { passwordReset: true }); }}>Reset Password</Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px] border-destructive/20 text-destructive hover:bg-destructive/10" onClick={async () => { if (confirm("Delete this user permanently?")) { await fetch(`/api/admin/users/${user.userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${(window as any).__adminToken || ""}` } }); toast.success("User deleted"); onRefresh(); } }}>Delete</Button>
      </div>
      <div className="mt-2.5 space-y-1.5 max-h-40 overflow-y-auto">
        {items.map((it: any) => (
          <div key={it.id || `${it.activity}-${it.created_at}`} className="rounded-lg bg-card border border-border/40 p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Badge variant="outline" className={`text-[9px] whitespace-nowrap ${it.read_status === "unread" ? "border-primary/40 text-primary bg-primary/5" : "border-border/30 text-muted-foreground"}`}>{it.activity || it.kind || "activity"}</Badge>
                <span className="text-[10px] text-muted-foreground truncate">{it.created_at ? new Date(it.created_at).toLocaleString() : ""}</span>
              </div>
              {it.id && <Button size="sm" variant="ghost" className="h-6 px-1.5 text-destructive" onClick={() => void onDeleteNotification(it.id)}><Trash2 className="w-3 h-3" /></Button>}
            </div>
            <p className="text-xs mt-0.5">{it.message || it.title || ""}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5">{user.total} activity item(s) · {user.unread} unread</p>
    </div>
  );
}

'''
    src = component + src

    open(PATH, "w").write(src)
    print("UserHubBox added")
