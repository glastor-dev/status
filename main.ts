/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

// Carga segura de variables de entorno para desarrollo local.
// En Deno Deploy, las variables se inyectan nativamente en el entorno y no existe archivo .env.
if (!Deno.env.get("DENO_DEPLOYMENT_ID")) {
  try {
    const { load } = await import("$std/dotenv/mod.ts");
    await load({ export: true, examplePath: null });
  } catch {
    // Silencioso en entornos sin archivo .env
  }
}

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";

await start(manifest, config);
