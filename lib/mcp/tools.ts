// Outils du connecteur « Mes boutiques » utilisés par Claude Cowork.
import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { admin, getOwnerId } from "@/lib/supabase/admin";

type Shop = {
  id: string;
  nom: string;
  taille: string | null;
  alias_email: string | null;
  actif: boolean;
  avatar_url: string | null;
  style_avatar: string | null;
  style_fond: string | null;
  style_sol: string | null;
};

const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (message: string) => ({ content: [{ type: "text" as const, text: "Erreur : " + message }], isError: true });

async function shops(owner: string): Promise<Shop[]> {
  const { data, error } = await admin()
    .from("shops")
    .select("id, nom, taille, alias_email, actif, avatar_url, style_avatar, style_fond, style_sol")
    .eq("owner_id", owner)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data as Shop[];
}

/** Retrouve une boutique par son id ou son nom (sans tenir compte des majuscules). */
async function findShop(owner: string, value: string) {
  const list = await shops(owner);
  const v = value.trim().toLowerCase();
  const s = list.find((x) => x.id === value || x.nom.trim().toLowerCase() === v);
  if (!s) throw new Error(`Boutique « ${value} » introuvable. Boutiques existantes : ${list.map((x) => x.nom).join(", ")}`);
  return s;
}

const ficheFields = {
  titre: z.string().max(200).optional().describe("Titre de l'annonce (50 caractères conseillés)"),
  description: z.string().optional().describe("Description de l'annonce"),
  prix: z.number().nonnegative().optional().describe("Prix de vente affiché sur Vinted, en euros"),
  prix_achat: z.number().nonnegative().optional().describe("Prix d'achat chez le fournisseur, en euros"),
  marque: z.string().optional(),
  categorie: z.string().optional(),
  couleur: z.string().optional(),
  matiere: z.string().optional(),
  etat: z.string().optional().describe("Ex. : Neuf avec étiquette, Très bon état…"),
  statut: z.enum(["brouillon", "en_ligne", "vendu"]).optional(),
  vinted_url: z.string().url().optional().describe("Lien de l'annonce Vinted une fois publiée"),
  notes: z.string().optional(),
};

async function uploadImage(owner: string, bytes: Uint8Array, contentType: string) {
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const path = `${owner}/${crypto.randomUUID()}.${ext}`;
  const { error } = await admin().storage.from("photos").upload(path, bytes, { contentType });
  if (error) throw new Error(error.message);
  return admin().storage.from("photos").getPublicUrl(path).data.publicUrl;
}

async function addPhotos(owner: string, ficheId: string, urls: string[]) {
  const { data, error } = await admin()
    .from("listings")
    .select("photos")
    .eq("id", ficheId)
    .eq("owner_id", owner)
    .single();
  if (error || !data) throw new Error("Fiche introuvable.");
  const photos = [...(data.photos as string[]), ...urls];
  const r = await admin().from("listings").update({ photos }).eq("id", ficheId);
  if (r.error) throw new Error(r.error.message);
  return photos;
}

export function buildServer(appUrl: string) {
  const server = new McpServer({ name: "mes-boutiques", version: "1.0.0" });
  const ficheLink = (id: string) => `${appUrl}/fiches?fiche=${id}`;

  server.registerTool(
    "lister_boutiques",
    {
      title: "Lister les boutiques",
      description:
        "Liste les boutiques Vinted de l'utilisateur : nom (pseudo Vinted), taille, alias e-mail, et le style photo " +
        "à respecter pour les photos portées de cette boutique : avatar (description + photo de référence avatar_url), " +
        "fond (décor) et sol. Toujours utiliser le style de la boutique choisie pour générer les photos.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const list = await shops(await getOwnerId());
        return ok(list.filter((s) => s.actif).map(({ actif: _a, ...s }) => s));
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  server.registerTool(
    "enregistrer_fiche",
    {
      title: "Enregistrer une fiche produit",
      description:
        "Enregistre une nouvelle fiche produit dans le tableau de bord « Mes boutiques ». " +
        "À appeler à la fin de la création d'une annonce. Le lien produit (fournisseur) est obligatoire : " +
        "il sera affiché sur la vente quand l'article sera vendu. Ajoute ensuite les photos avec ajouter_photo.",
      inputSchema: {
        boutique: z.string().describe("Nom (pseudo Vinted) ou id de la boutique, voir lister_boutiques"),
        lien_produit: z.string().url().describe("Lien fournisseur du produit (AliExpress, 1688…)"),
        autres_liens: z.array(z.string().url()).optional().describe("Autres liens fournisseur éventuels"),
        photos_urls: z.array(z.string().url()).optional().describe("Liens publics d'images à joindre"),
        ...ficheFields,
      },
    },
    async (a) => {
      try {
        const owner = await getOwnerId();
        const shop = await findShop(owner, a.boutique);
        const { boutique: _b, lien_produit, autres_liens, photos_urls, ...rest } = a;
        const { data, error } = await admin()
          .from("listings")
          .insert({
            ...rest,
            owner_id: owner,
            shop_id: shop.id,
            liens_produit: [lien_produit, ...(autres_liens ?? [])],
            photos: photos_urls ?? [],
            statut: a.statut ?? "brouillon",
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        return ok({ fiche_id: data.id, boutique: shop.nom, taille: shop.taille, lien: ficheLink(data.id) });
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  server.registerTool(
    "ajouter_photo",
    {
      title: "Ajouter une photo à une fiche",
      description:
        "Ajoute une photo à une fiche. Donne soit `url` (image accessible publiquement), " +
        "soit `base64` (contenu du fichier image encodé en base64, 3 Mo maximum) avec `type`.",
      inputSchema: {
        fiche_id: z.string().min(1),
        url: z.string().url().optional(),
        base64: z.string().optional(),
        type: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
      },
    },
    async (a) => {
      try {
        const owner = await getOwnerId();
        let bytes: Uint8Array;
        let type: string = a.type ?? "image/jpeg";
        if (a.base64) {
          bytes = Uint8Array.from(Buffer.from(a.base64.replace(/^data:[^,]+,/, ""), "base64"));
        } else if (a.url) {
          const res = await fetch(a.url);
          if (!res.ok) throw new Error(`Image inaccessible (${res.status})`);
          type = res.headers.get("content-type")?.split(";")[0] ?? type;
          if (!type.startsWith("image/")) throw new Error("Le lien ne pointe pas vers une image.");
          bytes = new Uint8Array(await res.arrayBuffer());
        } else throw new Error("Donne `url` ou `base64`.");
        if (bytes.length > 8 * 1024 * 1024) throw new Error("Image trop lourde (8 Mo maximum).");
        const url = await uploadImage(owner, bytes, type);
        const photos = await addPhotos(owner, a.fiche_id, [url]);
        return ok({ fiche_id: a.fiche_id, photo: url, nombre_de_photos: photos.length });
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  server.registerTool(
    "modifier_fiche",
    {
      title: "Modifier une fiche",
      description:
        "Modifie une fiche existante (par exemple statut « en_ligne » une fois publiée sur Vinted, avec vinted_url).",
      inputSchema: {
        fiche_id: z.string().min(1),
        boutique: z.string().optional(),
        liens_produit: z.array(z.string().url()).optional().describe("Remplace la liste des liens fournisseur"),
        ...ficheFields,
      },
    },
    async (a) => {
      try {
        const owner = await getOwnerId();
        const { fiche_id, boutique, ...rest } = a;
        const patch: Record<string, unknown> = { ...rest };
        if (boutique) patch.shop_id = (await findShop(owner, boutique)).id;
        const { data, error } = await admin()
          .from("listings")
          .update(patch)
          .eq("id", fiche_id)
          .eq("owner_id", owner)
          .select("id")
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) throw new Error("Fiche introuvable.");
        return ok({ fiche_id, modifiee: true, lien: ficheLink(fiche_id) });
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  server.registerTool(
    "chercher_fiches",
    {
      title: "Chercher des fiches",
      description: "Cherche des fiches par texte (titre ou lien produit), boutique ou statut. Les plus récentes d'abord.",
      inputSchema: {
        texte: z.string().optional(),
        boutique: z.string().optional(),
        statut: z.enum(["brouillon", "en_ligne", "vendu"]).optional(),
        limite: z.number().int().min(1).max(50).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (a) => {
      try {
        const owner = await getOwnerId();
        let q = admin()
          .from("listings")
          .select("id, titre, prix, prix_achat, statut, liens_produit, shop_id, created_at")
          .eq("owner_id", owner)
          .order("created_at", { ascending: false })
          .limit(a.limite ?? 20);
        if (a.statut) q = q.eq("statut", a.statut);
        if (a.boutique) q = q.eq("shop_id", (await findShop(owner, a.boutique)).id);
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        const all = await shops(owner);
        const t = a.texte?.toLowerCase();
        return ok(
          (data ?? [])
            .filter((f) => !t || f.titre.toLowerCase().includes(t) || f.liens_produit.some((l: string) => l.toLowerCase().includes(t)))
            .map((f) => ({ ...f, boutique: all.find((s) => s.id === f.shop_id)?.nom, lien: ficheLink(f.id) }))
        );
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  return server;
}
