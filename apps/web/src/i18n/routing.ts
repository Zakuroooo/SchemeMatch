import { defineRouting } from "next-intl/routing";

/** English and Bengali for now (Week 4); Hindi and Marathi come later. */
export const routing = defineRouting({ locales: ["en", "bn"], defaultLocale: "en" });

export type Locale = (typeof routing.locales)[number];
