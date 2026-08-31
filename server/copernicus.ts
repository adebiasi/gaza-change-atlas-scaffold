/**
 * Server-only Copernicus Data Space adapter.
 * Keep this file outside the static Next.js bundle and run it in a serverless
 * function/container where CDSE_CLIENT_ID and CDSE_CLIENT_SECRET are secret.
 */

const TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const CATALOG_URL = "https://stac.dataspace.copernicus.eu/v1/search";
const PROCESS_URL = "https://sh.dataspace.copernicus.eu/process/v1";

let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;
  const clientId = process.env.CDSE_CLIENT_ID;
  const clientSecret = process.env.CDSE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing CDSE_CLIENT_ID/CDSE_CLIENT_SECRET");

  const body = new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret });
  const response = await fetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!response.ok) throw new Error(`CDSE token request failed: ${response.status}`);
  const json = await response.json() as { access_token: string; expires_in?: number };
  cached = { token: json.access_token, expiresAt: Date.now() + ((json.expires_in ?? 3600) * 1000) };
  return json.access_token;
}

export async function searchSentinel2(bbox: [number, number, number, number], from: string, to: string) {
  const token = await accessToken();
  const response = await fetch(CATALOG_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      collections: ["sentinel-2-l2a"],
      bbox,
      datetime: `${from}/${to}`,
      limit: 100,
      fields: { include: ["id", "properties.datetime", "properties.eo:cloud_cover"], exclude: [] },
    }),
  });
  if (!response.ok) throw new Error(`CDSE catalog request failed: ${response.status}`);
  return response.json();
}

export async function processTrueColor(bbox: [number, number, number, number], from: string, to: string, width = 1024, height = 1024) {
  const token = await accessToken();
  const evalscript = `//VERSION=3\nfunction setup(){return {input:["B02","B03","B04"],output:{bands:3}}}\nfunction evaluatePixel(s){return [2.5*s.B04,2.5*s.B03,2.5*s.B02]}`;
  const response = await fetch(PROCESS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      input: { bounds: { bbox, properties: { crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" } }, data: [{ type: "S2L2A", dataFilter: { timeRange: { from, to }, mosaickingOrder: "leastCC" } }] },
      output: { width, height, responses: [{ identifier: "default", format: { type: "image/jpeg" } }] },
      evalscript,
    }),
  });
  if (!response.ok) throw new Error(`CDSE process request failed: ${response.status}`);
  return response.arrayBuffer();
}
