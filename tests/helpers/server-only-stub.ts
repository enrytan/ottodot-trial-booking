// Intentionally empty.
//
// Stands in for the `server-only` package under Vitest, which does not supply
// React's "react-server" resolve condition and would otherwise hit the module
// that throws on import. Next.js still enforces the real thing at build time,
// so a Client Component importing a server module remains a build failure.
export {};
