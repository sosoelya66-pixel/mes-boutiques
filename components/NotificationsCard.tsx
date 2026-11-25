"use client";

import { useEffect, useState } from "react";

let PUBLIC_KEY = "";

function keyToBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "loading" | "unsupported" | "install" | "denied" | "off" | "on" | "nokeys";

export function NotificationsCard() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      PUBLIC_KEY = (await fetch("/api/push/key").then((r) => r.json()).catch(() => ({ key: "" }))).key ?? "";
      if (!PUBLIC_KEY) return setState("nokeys");
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
        return setState(ios && !standalone ? "install" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(PUBLIC_KEY) });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), appareil: navigator.userAgent }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Erreur ${res.status}`);
      setState("on");
      setMsg({ text: "Notifications activées sur cet appareil ✓" });
    } catch (e) {
      setMsg({ text: (e as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });
        await sub.unsubscribe();
      }
      setState("off");
      setMsg(null);
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
      setMsg({ text: json.sent ? `Notification envoyée à ${json.sent} appareil(s).` : "Aucun appareil inscrit." });
    } catch (e) {
      setMsg({ text: (e as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="notifications" className="rise rounded-2xl glass p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <h2 className="font-display text-[17px] font-semibold">🔔 Notifications</h2>
          <p className="mt-1 text-sm text-muted">
            Une notification à chaque nouvelle vente, et un rappel chaque matin si des colis attendent depuis plus de 2 jours.
          </p>
          {state === "on" && <p className="mt-2 text-sm text-profit">Activées sur cet appareil.</p>}
          {state === "install" && (
            <p className="mt-2 text-sm text-alert">
              Sur iPhone, installe d&apos;abord l&apos;appli : dans Safari, bouton Partager → « Sur l&apos;écran d&apos;accueil », puis
              ouvre-la depuis son icône et reviens ici.
            </p>
          )}
          {state === "denied" && (
            <p className="mt-2 text-sm text-alert">
              Notifications refusées. Réactive-les dans Réglages → Notifications → Boutiques (iPhone), ou dans les réglages du
              navigateur.
            </p>
          )}
          {state === "unsupported" && <p className="mt-2 text-sm text-alert">Ce navigateur ne gère pas les notifications.</p>}
          {state === "nokeys" && <p className="mt-2 text-sm text-alert">Clés de notification manquantes dans Vercel (VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY), ou appli pas encore relancée (Redeploy).</p>}
          {msg && <p className={`mt-2 text-sm ${msg.error ? "text-alert" : "text-profit"}`}>{msg.text}</p>}
        </div>
        <div className="flex gap-2">
          {state === "off" && (
            <button className="btn-primary" onClick={enable} disabled={busy}>
              Activer
            </button>
          )}
          {state === "on" && (
            <>
              <button className="btn" onClick={test} disabled={busy}>
                Tester
              </button>
              <button className="btn" onClick={disable} disabled={busy}>
                Désactiver
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
