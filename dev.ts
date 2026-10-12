#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";
import { load } from "$std/dotenv/mod.ts";

// Cargar .env si existe, deshabilitando validación estricta de variables de ejemplo
await load({ export: true, examplePath: null });

await dev(import.meta.url, "./main.ts", config);
