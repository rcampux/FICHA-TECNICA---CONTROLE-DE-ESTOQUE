const REQUEST_TIMEOUT_MS = 9000;

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", status === 200 ? "public, s-maxage=86400, stale-while-revalidate=604800" : "no-store");
  response.end(JSON.stringify(payload));
}

function normalizeQuery(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 120);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function readNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mapNutrition(product) {
  const nutriments = product?.nutriments || {};
  const kcal = readNumber(nutriments["energy-kcal_100g"])
    ?? (readNumber(nutriments["energy-kj_100g"]) == null ? null : readNumber(nutriments["energy-kj_100g"]) / 4.184);

  return {
    kcal,
    carb: readNumber(nutriments.carbohydrates_100g),
    prot: readNumber(nutriments.proteins_100g),
    fat: readNumber(nutriments.fat_100g),
    satFat: readNumber(nutriments["saturated-fat_100g"]),
    transFat: readNumber(nutriments["trans-fat_100g"]),
    fiber: readNumber(nutriments.fiber_100g),
    sodium: readNumber(nutriments.sodium_100g) == null ? null : readNumber(nutriments.sodium_100g) * 1000,
    portionSize: 100,
    source: "open-food-facts",
    sourceProduct: product?.product_name || product?.generic_name || "",
    sourceBrand: product?.brands || "",
    sourceCode: product?.code || "",
  };
}

function scoreProduct(product, query) {
  const normalizedQuery = normalizeText(query);
  const name = normalizeText(`${product?.product_name || ""} ${product?.generic_name || ""} ${product?.brands || ""}`);
  const nutrition = mapNutrition(product);
  const completeness = [nutrition.kcal, nutrition.carb, nutrition.prot, nutrition.fat, nutrition.fiber, nutrition.sodium]
    .filter((value) => value !== null).length;
  const nameScore = name === normalizedQuery ? 100 : name.includes(normalizedQuery) ? 50 : normalizedQuery.split(" ").filter((term) => name.includes(term)).length * 8;
  return nameScore + completeness;
}

function chooseNutritionProduct(products, query) {
  return (products || [])
    .filter((product) => product?.nutriments && (product.product_name || product.generic_name)
      && ["kcal", "carb", "prot", "fat", "fiber", "sodium"].some((key) => mapNutrition(product)[key] !== null))
    .sort((left, right) => scoreProduct(right, query) - scoreProduct(left, query))[0] || null;
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, {error: "Metodo nao permitido."});
    return;
  }

  const params = new URL(request.url || "/api/nutrition-search", "https://nk-control.vercel.app").searchParams;
  const query = normalizeQuery(params.get("q"));
  if (query.length < 2) {
    sendJson(response, 400, {error: "Informe o nome do produto para gerar a tabela."});
    return;
  }

  try {
    const searchUrl = new URL("https://world.openfoodfacts.org/cgi/search.pl");
    searchUrl.searchParams.set("search_terms", query);
    searchUrl.searchParams.set("search_simple", "1");
    searchUrl.searchParams.set("action", "process");
    searchUrl.searchParams.set("json", "1");
    searchUrl.searchParams.set("page_size", "12");
    searchUrl.searchParams.set("fields", "code,product_name,generic_name,brands,nutriments");

    const nutritionResponse = await fetch(searchUrl, {
      headers: {"user-agent": "NK-Control/1.0 nutrition-assistant (https://nk-control.vercel.app)"},
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!nutritionResponse.ok) throw new Error(`Open Food Facts ${nutritionResponse.status}`);

    const payload = await nutritionResponse.json();
    const product = chooseNutritionProduct(payload?.products, query);
    if (!product) {
      sendJson(response, 404, {error: "Nao encontramos uma tabela confiavel para esse produto."});
      return;
    }

    sendJson(response, 200, {query, nutrition: mapNutrition(product)});
  } catch (error) {
    console.error("Nutrition search failed:", error?.message || error);
    sendJson(response, 502, {error: "Nao foi possivel gerar a tabela agora. Voce ainda pode preencher manualmente."});
  }
}

export {chooseNutritionProduct, mapNutrition, scoreProduct};
