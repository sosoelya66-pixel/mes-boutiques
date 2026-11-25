import "server-only";

export type Step = { id: string; step: "texte" | "photo"; i?: number };

/** Déclenche une étape de préparation dans une nouvelle exécution serveur. */
export async function triggerStep(origin: string, body: Step) {
  await fetch(`${origin}/api/fiches/jobs/step`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MCP_TOKEN}` },
    body: JSON.stringify(body),
  }).catch(() => {});
}
