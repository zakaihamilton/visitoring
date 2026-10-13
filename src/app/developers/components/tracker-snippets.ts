export const trackerSnippet =
  '<script defer src="https://visitoring.vercel.app/tracker.js" data-site-key="vk_YOUR_SITE_KEY"></script>';

export const eventSnippet = [
  "function onSignupSuccess() {",
  '  window.Visitoring.track("signup", {',
  '    plan: "starter"',
  "  });",
  "}",
].join("\n");

export const reactRootSnippet = [
  'import { VisitoringProvider } from "visitoring";',
  'import { createRoot } from "react-dom/client";',
  'import App from "./App";',
  "",
  'createRoot(document.getElementById("root")!).render(',
  '  <VisitoringProvider siteKey="vk_YOUR_SITE_KEY">',
  "    <App />",
  "  </VisitoringProvider>",
  ");",
].join("\n");

export const nextRootSnippet = [
  'import type { ReactNode } from "react";',
  'import { VisitoringProvider } from "visitoring";',
  "",
  "export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {",
  "  return (",
  '    <html lang="en">',
  "      <body>",
  "        <VisitoringProvider",
  '          siteKey={process.env.NEXT_PUBLIC_VISITORING_SITE_KEY ?? ""}',
  "        >",
  "          {children}",
  "        </VisitoringProvider>",
  "      </body>",
  "    </html>",
  "  );",
  "}",
].join("\n");

export const reactEventSnippet = [
  '"use client";',
  "",
  'import { useVisitoring } from "visitoring";',
  "",
  "export function SignupButton() {",
  "  const { track } = useVisitoring();",
  "  async function onSignup() {",
  "    const result = await completeSignup();",
  '    if (result.ok) track("signup", { plan: "starter" });',
  "  }",
  '  return <button type="button" onClick={onSignup}>Sign up</button>;',
  "}",
].join("\n");
