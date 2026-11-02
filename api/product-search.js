const SEARCH_LIMIT = 10;
const REQUEST_TIMEOUT_MS = 9000;

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(payload));
}

function readSearchParams(request) {
  return new URL(request.url || "/api/product-search", "https://nk-control.vercel.app").searchParams;
}

function normalizeQuery(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 120);
}

function isValidCoordinate(value, minimum, maximum) {
  if (value === null || value === undefined || String(value).trim() === "") return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum;
}

async function resolveNearbyLocation(latitude, longitude) {
  if (!isValidCoordinate(latitude, -90, 90) || !isValidCoordinate(longitude, -180, 180)) return "";

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", "10");
  url.searchParams.set("accept-language", "pt-BR");

  const response = await fetch(url, {
    headers: {"user-agent": "NK-Control/1.0 product-search (https://nk-control.vercel.app)"},
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) return "";

  const payload = await response.json();
  const address = payload?.address || {};
  const city = address.city || address.town || address.village || address.municipality || "";
  const state = address.state || "";
  const country = address.country || "Brasil";
  return [city, state, country].filter(Boolean).join(", ");
}

function normalizeShoppingResult(result, index) {
  const price = Number(result?.extracted_price);
  if (!result?.title || !Number.isFinite(price) || price < 0) return null;

  return {
    id: String(result.product_id || `${index}-${result.title}-${price}`),
    title: String(result.title).trim(),
    market: String(result.source || "Loja online").trim(),
    price,
    priceLabel: String(result.price || "").trim(),
    thumbnail: String(result.thumbnail || result.serpapi_thumbnail || "").trim(),
    link: String(result.product_link || "").trim(),
    delivery: String(result.delivery || "").trim(),
    rating: Number.isFinite(Number(result.rating)) ? Number(result.rating) : null,
  };
}

function selectCheapestResults(results, limit = SEARCH_LIMIT) {
  const seen = new Set();
  return (results || [])
    .map(normalizeShoppingResult)
    .filter(Boolean)
    .sort((left, right) => left.price - right.price)
    .filter((result) => {
      const key = `${result.title.toLocaleLowerCase("pt-BR")}|${result.market.toLocaleLowerCase("pt-BR")}|${result.price}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function distanceInKm(latitude, longitude, targetLatitude, targetLongitude) {
  const radians = Math.PI / 180;
  const a = Math.sin((targetLatitude-latitude)*radians/2)**2
    + Math.cos(latitude*radians)*Math.cos(targetLatitude*radians)*Math.sin((targetLongitude-longitude)*radians/2)**2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0,1-a)));
}

function filterNearbyStores(results, latitude, longitude, radiusKm) {
  return (results || []).filter(store => isValidCoordinate(store.gps_coordinates?.latitude,-90,90)
    && isValidCoordinate(store.gps_coordinates?.longitude,-180,180))
    .map(store => ({name:String(store.title || "Mercado"),address:String(store.address || ""),
      distanceKm:distanceInKm(latitude,longitude,store.gps_coordinates.latitude,store.gps_coordinates.longitude)}))
    .filter(store => store.distanceKm <= radiusKm)
    .sort((a,b) => a.distanceKm-b.distanceKm);
}

function normalizeMarketName(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/\b(supermercados?|super|mercados?|online|lojas?|rede|delivery|com|br)\b/g, " ")
    .replace(/[^a-z0-9]+/g," ").trim();
}

function matchNearbyOffers(offers, stores) {
  return offers.flatMap(offer => {
    const name = normalizeMarketName(offer.market);
    if (name.length < 3) return [];
    const store = stores.find(candidate => {
      const localName = normalizeMarketName(candidate.name);
      return localName === name || localName.startsWith(`${name} `);
    });
    return store ? [{...offer,distanceKm:store.distanceKm,nearbyStore:store.name}] : [];
  }).slice(0, SEARCH_LIMIT);
}

async function findNearbyStores(latitude, longitude, radiusKm, apiKey) {
  const url = new URL("https://serpapi.com/search.json");
  const zoom = radiusKm <= 3 ? 14 : radiusKm <= 10 ? 12 : radiusKm <= 25 ? 10 : 9;
  url.search = new URLSearchParams({engine:"google_maps",type:"search",q:"supermercados",hl:"pt-br",ll:`@${latitude},${longitude},${zoom}z`,api_key:apiKey});
  const response = await fetch(url,{signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error("Nearby market search unavailable");
  return filterNearbyStores(payload.local_results,Number(latitude),Number(longitude),radiusKm);
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, {error: "Metodo nao permitido."});
    return;
  }

  const params = readSearchParams(request);
  const query = normalizeQuery(params.get("q"));
  const mode = params.get("mode") === "near" ? "near" : "general";
  if (query.length < 2) {
    sendJson(response, 400, {error: "Digite ao menos dois caracteres para pesquisar."});
    return;
  }

  const apiKey = process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY || "";
  if (!apiKey) {
    sendJson(response, 503, {
      code: "search_provider_not_configured",
      error: "A pesquisa de mercados ainda nao foi configurada neste ambiente.",
    });
    return;
  }

  try {
    let location = "";
    let nearbyStores = [];
    const radiusKm = Number(params.get("radius") || 5);
    if (mode === "near") {
      if (!Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 50) {
        sendJson(response,400,{error:"Escolha um raio entre 1 e 50 km."});
        return;
      }
      const latitude = params.get("lat");
      const longitude = params.get("lng");
      if (!isValidCoordinate(latitude, -90, 90) || !isValidCoordinate(longitude, -180, 180)) {
        sendJson(response, 400, {error: "Permita o acesso a localizacao para ver mercados proximos."});
        return;
      }
      [location,nearbyStores] = await Promise.all([
        resolveNearbyLocation(latitude, longitude),
        findNearbyStores(latitude, longitude, radiusKm, apiKey),
      ]);
      if (!location) {
        sendJson(response, 502, {error: "Nao foi possivel identificar sua cidade. Tente novamente ou use a busca Geral."});
        return;
      }
    }

    const providerUrl = new URL("https://serpapi.com/search.json");
    providerUrl.searchParams.set("engine", "google_shopping");
    providerUrl.searchParams.set("q", mode === "near" ? `${query} supermercado` : query);
    providerUrl.searchParams.set("gl", "br");
    providerUrl.searchParams.set("hl", "pt-br");
    providerUrl.searchParams.set("api_key", apiKey);
    if (location) providerUrl.searchParams.set("location", location);

    const providerResponse = await fetch(providerUrl, {signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
    const providerPayload = await providerResponse.json().catch(() => ({}));
    if (!providerResponse.ok || providerPayload?.error) {
      throw new Error(providerPayload?.error || `Pesquisa indisponivel (${providerResponse.status}).`);
    }

    const offers = selectCheapestResults(providerPayload.shopping_results, mode === "near" ? 100 : SEARCH_LIMIT);
    const results = mode === "near" ? matchNearbyOffers(offers,nearbyStores) : offers;
    sendJson(response, 200, {
      query,
      mode,
      location: location || null,
      results,
      resultCount: results.length,
      ...(mode === "near" ? {
        radiusKm,
        nearbyStores:nearbyStores.slice(0,10),
        notice:`${results.length} oferta(s) online de redes com mercados encontrados em até ${radiusKm} km. Confirme preço e disponibilidade na unidade; a lista pode não incluir todos os mercados da região.`,
      } : {}),
      searchUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`,
    });
  } catch (error) {
    console.error("Product search failed:", error?.message || error);
    sendJson(response, 502, {error: "Nao foi possivel consultar os mercados agora. Tente novamente."});
  }
}

export {normalizeShoppingResult, selectCheapestResults, distanceInKm, filterNearbyStores, matchNearbyOffers};
