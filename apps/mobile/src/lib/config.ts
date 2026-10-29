/**
 * The API the app sends saved screenings to. EXPO_PUBLIC_ values are baked into the app when
 * it is built, so anyone can read them: never put a secret here.
 */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://schemematch-api-zakuroooos-projects.vercel.app"
).replace(/\/$/, "");
