/** Traduit les erreurs des API (Claude, OpenAI) en messages compréhensibles. */
export function humanError(e: unknown, service: "Claude" | "OpenAI") {
  const m = e instanceof Error ? e.message : String(e);
  const key = service === "Claude" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
  if (/authentication_error|invalid x-api-key|incorrect api key|invalid_api_key|401/i.test(m))
    return `Clé ${service} invalide : vérifie ${key} dans Vercel (puis Redeploy).`;
  if (/credit balance|insufficient_quota|billing|quota/i.test(m))
    return `Crédit ${service} épuisé : recharge ton compte (${service === "Claude" ? "console.anthropic.com" : "platform.openai.com"} → Billing).`;
  if (/organization must be verified|verify your organization/i.test(m))
    return "OpenAI demande de vérifier ton organisation : platform.openai.com → Settings → Organization → Verify.";
  if (/safety|moderation|content_policy|refus/i.test(m)) return `${service} a refusé cette demande (contenu jugé sensible). Essaie avec d'autres photos.`;
  if (/rate_limit|429|overloaded|529/i.test(m)) return `${service} est surchargé : réessaie dans quelques minutes.`;
  return m.length > 200 ? m.slice(0, 200) + "…" : m;
}
