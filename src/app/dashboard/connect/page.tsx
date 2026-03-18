"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Platform = "ios" | "android";
type Step = "platform" | "credentials" | "apps" | "done";

interface AppleCredentials {
  issuerId: string;
  keyId: string;
  privateKey: string;
}

interface AndroidCredentials {
  serviceAccountJson: string; // raw JSON text from file
  packageName: string;
}

interface ConnectedApp {
  id?: string;
  storeAppId: string;
  name: string;
  bundleId?: string;
  alreadyConnected?: boolean;
}

export default function ConnectPage() {
  return (
    <Suspense>
      <ConnectPageInner />
    </Suspense>
  );
}

function ConnectPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillPlatform = (searchParams.get("platform") as Platform | null) ?? "ios";
  const prefillAppName = searchParams.get("appName") ?? "";

  const [step, setStep] = useState<Step>("platform");
  const [platform, setPlatform] = useState<Platform>(prefillPlatform);
  const [displayName, setDisplayName] = useState(prefillAppName);
  const [appleCreds, setAppleCreds] = useState<AppleCredentials>({ issuerId: "", keyId: "", privateKey: "" });
  const [androidCreds, setAndroidCreds] = useState<AndroidCredentials>({ serviceAccountJson: "", packageName: "" });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [connectionId, setConnectionId] = useState("");
  const [availableApps, setAvailableApps] = useState<ConnectedApp[]>([]);
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());
  const [loadingApps, setLoadingApps] = useState(false);
  const [savingApps, setSavingApps] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [newPackageName, setNewPackageName] = useState("");
  const [newAppName, setNewAppName] = useState("");

  async function handleConnect() {
    setError("");
    setConnecting(true);
    try {
      let credentials: Record<string, unknown>;
      if (platform === "ios") {
        if (!appleCreds.issuerId || !appleCreds.keyId || !appleCreds.privateKey) {
          setError("All Apple fields are required.");
          return;
        }
        credentials = { issuerId: appleCreds.issuerId.trim(), keyId: appleCreds.keyId.trim(), privateKey: appleCreds.privateKey.trim() };
      } else {
        if (!androidCreds.serviceAccountJson) {
          setError("Service account JSON is required.");
          return;
        }
        let sa: Record<string, unknown>;
        try {
          sa = JSON.parse(androidCreds.serviceAccountJson);
        } catch {
          setError("Invalid JSON in service account file.");
          return;
        }
        credentials = { serviceAccountJson: sa, packageName: androidCreds.packageName.trim() || undefined };
      }

      const res = await fetch("/api/store/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          displayName: displayName || (platform === "ios" ? "My App Store Connect" : "My Google Play"),
          credentials,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Connection failed");
        return;
      }

      setConnectionId(data.connection.id);
      await loadApps(data.connection.id);
      setStep("apps");
    } finally {
      setConnecting(false);
    }
  }

  async function loadApps(connId: string) {
    setLoadingApps(true);
    try {
      const res = await fetch(`/api/store/connections/${connId}/apps`);
      const data = await res.json();
      setAvailableApps(data.apps ?? []);
      setManualEntry(data.manualEntry ?? false);
    } finally {
      setLoadingApps(false);
    }
  }

  function toggleApp(id: string) {
    setSelectedAppIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addManualApp() {
    if (!newPackageName.trim()) return;
    const app: ConnectedApp = {
      storeAppId: newPackageName.trim(),
      name: newAppName.trim() || newPackageName.trim(),
    };
    setAvailableApps((prev) => [...prev, app]);
    setSelectedAppIds((prev) => new Set([...prev, app.storeAppId]));
    setNewPackageName("");
    setNewAppName("");
  }

  async function handleSaveApps() {
    setSavingApps(true);
    setError("");
    try {
      const appsToSave = availableApps
        .filter((a) => selectedAppIds.has(a.id ?? a.storeAppId))
        .map((a) => ({
          storeAppId: a.storeAppId ?? a.id,
          name: a.name,
          bundleId: a.bundleId,
        }));

      if (appsToSave.length === 0) {
        setStep("done");
        return;
      }

      const res = await fetch(`/api/store/connections/${connectionId}/apps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apps: appsToSave }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save apps");
        return;
      }

      setStep("done");
    } finally {
      setSavingApps(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-12">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(["platform", "credentials", "apps", "done"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{
                backgroundColor: step === s ? "var(--accent)" : ["platform", "credentials", "apps", "done"].indexOf(step) > i ? "var(--pass-bg)" : "var(--bg-section)",
                color: step === s ? "#fff" : "var(--text-muted)",
              }}
            >
              {["platform", "credentials", "apps", "done"].indexOf(step) > i ? "✓" : i + 1}
            </div>
            {i < 3 && <div className="h-px w-6 flex-shrink-0" style={{ backgroundColor: "var(--border)" }} />}
          </div>
        ))}
        <p className="text-xs ml-2 capitalize" style={{ color: "var(--text-muted)" }}>{step}</p>
      </div>

      {/* Step: Platform */}
      {step === "platform" && (
        <div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Connect your store</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Link your App Store Connect or Google Play account to automatically track ASO metrics.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {(["ios", "android"] as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className="p-5 rounded-2xl border-2 transition-all text-left"
                style={{
                  borderColor: platform === p ? "var(--accent)" : "var(--border)",
                  backgroundColor: platform === p ? "rgba(30,27,75,0.04)" : "var(--bg-card)",
                }}
              >
                <div className="text-2xl mb-2">{p === "ios" ? "🍎" : "🤖"}</div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {p === "ios" ? "App Store (iOS)" : "Google Play (Android)"}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {p === "ios" ? "App Store Connect API" : "Play Developer API"}
                </p>
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
              Display name (optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={platform === "ios" ? "My App Store Connect" : "My Google Play"}
              className="w-full px-3.5 py-2.5 text-sm border rounded-lg"
              style={{ backgroundColor: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          <button
            onClick={() => setStep("credentials")}
            className="w-full py-2.5 rounded-xl text-sm font-medium"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            Continue →
          </button>
        </div>
      )}

      {/* Step: Credentials */}
      {step === "credentials" && (
        <div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            {platform === "ios" ? "App Store Connect credentials" : "Google Play credentials"}
          </h1>

          {platform === "ios" ? (
            <div className="space-y-4">
              <div
                className="rounded-xl border px-4 py-3 text-xs mb-2"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)", color: "var(--text-secondary)" }}
              >
                <strong>How to get these:</strong> App Store Connect → Users and Access → Keys → Generate a key with Analytics access. Download the .p8 file (only downloadable once).
              </div>
              {[
                { label: "Issuer ID", key: "issuerId", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
                { label: "Key ID", key: "keyId", placeholder: "XXXXXXXXXX" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>{label}</label>
                  <input
                    type="text"
                    value={appleCreds[key as keyof AppleCredentials]}
                    onChange={(e) => setAppleCreds((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3.5 py-2.5 text-sm border rounded-lg font-mono"
                    style={{ backgroundColor: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                  Private key (.p8 file contents)
                </label>
                <textarea
                  value={appleCreds.privateKey}
                  onChange={(e) => setAppleCreds((p) => ({ ...p, privateKey: e.target.value }))}
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                  rows={5}
                  className="w-full px-3.5 py-2.5 text-xs border rounded-lg font-mono"
                  style={{ backgroundColor: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Paste the full contents of the .p8 file including the header and footer lines.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className="rounded-xl border px-4 py-3 text-xs mb-2"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)", color: "var(--text-secondary)" }}
              >
                <strong>How to get these:</strong> Google Cloud Console → IAM → Service Accounts → Create key (JSON). Then in Google Play Console → Users and permissions → Invite the service account email with &quot;View app information and download bulk reports&quot; permission.
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                  Service account JSON
                </label>
                <textarea
                  value={androidCreds.serviceAccountJson}
                  onChange={(e) => setAndroidCreds((p) => ({ ...p, serviceAccountJson: e.target.value }))}
                  placeholder={"{\n  \"type\": \"service_account\",\n  \"project_id\": \"...\",\n  ...\n}"}
                  rows={7}
                  className="w-full px-3.5 py-2.5 text-xs border rounded-lg font-mono"
                  style={{ backgroundColor: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                  Package name to validate (optional)
                </label>
                <input
                  type="text"
                  value={androidCreds.packageName}
                  onChange={(e) => setAndroidCreds((p) => ({ ...p, packageName: e.target.value }))}
                  placeholder="com.example.myapp"
                  className="w-full px-3.5 py-2.5 text-sm border rounded-lg font-mono"
                  style={{ backgroundColor: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--fail-border)", backgroundColor: "var(--fail-bg)", color: "var(--fail-text)" }}>
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => { setStep("platform"); setError(""); }}
              className="px-4 py-2.5 rounded-xl text-sm border"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Back
            </button>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              {connecting ? "Validating & connecting…" : "Connect account"}
            </button>
          </div>
        </div>
      )}

      {/* Step: Select Apps */}
      {step === "apps" && (
        <div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Select apps to track</h1>
          <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
            Choose which apps you want to track metrics for.
          </p>

          {loadingApps ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />
            </div>
          ) : (
            <>
              {availableApps.length > 0 && (
                <div className="space-y-2 mb-4">
                  {availableApps.map((app) => {
                    const appKey = app.id ?? app.storeAppId;
                    const selected = selectedAppIds.has(appKey);
                    return (
                      <button
                        key={appKey}
                        onClick={() => toggleApp(appKey)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                        style={{
                          borderColor: selected ? "var(--accent)" : "var(--border)",
                          backgroundColor: selected ? "rgba(30,27,75,0.04)" : "var(--bg-card)",
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: selected ? "var(--accent)" : "var(--bg-section)", border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}` }}
                        >
                          {selected && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{app.name}</p>
                          <p className="text-xs font-mono truncate" style={{ color: "var(--text-muted)" }}>{app.storeAppId ?? app.id}</p>
                        </div>
                        {app.alreadyConnected && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--pass-bg)", color: "var(--pass-text)" }}>
                            Connected
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Manual entry for Android */}
              {manualEntry && (
                <div
                  className="rounded-xl border p-4 mb-4"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
                >
                  <p className="text-xs font-medium mb-3" style={{ color: "var(--text-primary)" }}>Add app by package name</p>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newPackageName}
                      onChange={(e) => setNewPackageName(e.target.value)}
                      placeholder="com.example.myapp"
                      className="flex-1 px-3 py-2 text-xs border rounded-lg font-mono"
                      style={{ backgroundColor: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                    <input
                      type="text"
                      value={newAppName}
                      onChange={(e) => setNewAppName(e.target.value)}
                      placeholder="App name"
                      className="flex-1 px-3 py-2 text-xs border rounded-lg"
                      style={{ backgroundColor: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                    <button
                      onClick={addManualApp}
                      className="px-3 py-2 rounded-lg text-xs font-medium"
                      style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="mt-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--fail-border)", backgroundColor: "var(--fail-bg)", color: "var(--fail-text)" }}>
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2.5 rounded-xl text-sm border"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Skip for now
            </button>
            <button
              onClick={handleSaveApps}
              disabled={savingApps}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              {savingApps ? "Saving…" : `Track ${selectedAppIds.size} app${selectedAppIds.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Store connected!</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Metrics will be synced daily starting tomorrow. Your dashboard will show performance trends alongside experiments.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-5 py-2.5 rounded-xl text-sm border"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Go to dashboard
            </button>
            <button
              onClick={() => router.push("/dashboard/connect")}
              className="px-5 py-2.5 rounded-xl text-sm font-medium"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              Connect another store
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
