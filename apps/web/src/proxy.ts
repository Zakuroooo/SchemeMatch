import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next 16 calls this file `proxy` (it was `middleware` before). It sends "/" to the
// right language and keeps the language in the URL (/en, /bn).
export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals and files with a dot (favicon.ico, …).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
