export const shortUrl = (u: string) => {
  try {
    const x = new URL(u);
    return x.hostname.replace(/^www\./, "") + (x.pathname.length > 1 ? x.pathname.slice(0, 24) + "…" : "");
  } catch {
    return u;
  }
};
