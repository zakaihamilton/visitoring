# visitoring

Add Visitoring analytics to a React 18 or React 19 application.

```sh
npm install visitoring
```

## Add the provider

Wrap your app once with `VisitoringProvider`. It loads the browser tracker and buffers custom events
until the tracker is ready.

```tsx
import type { ReactNode } from "react";
import { VisitoringProvider } from "visitoring";

export function AppRoot({ children }: { children: ReactNode }) {
  return <VisitoringProvider siteKey="vk_YOUR_SITE_KEY">{children}</VisitoringProvider>;
}
```

For a Next.js App Router application, put the provider in the root layout. The provider is a Client
Component and can be rendered from the Server Component layout:

```tsx
import type { ReactNode } from "react";
import { VisitoringProvider } from "visitoring";

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <VisitoringProvider siteKey={process.env.NEXT_PUBLIC_VISITORING_SITE_KEY ?? ""}>
          {children}
        </VisitoringProvider>
      </body>
    </html>
  );
}
```

Set `NEXT_PUBLIC_VISITORING_SITE_KEY` in the app's environment. For Vite, use
`import.meta.env.VITE_VISITORING_SITE_KEY` in the provider where you create the React root. Tracking
keys are public browser identifiers; do not put a private credential in this prop.

## Track an event

Call `track` from a client component after the action succeeds:

Replace `completeSignup` with your app's form action.

```tsx
"use client";

import { useVisitoring } from "visitoring";

export function SignupButton() {
  const { track, status } = useVisitoring();

  async function onSignup() {
    const result = await completeSignup();
    if (result.ok) track("signup", { plan: "starter" });
  }

  return (
    <button type="button" onClick={onSignup}>
      Create account ({status})
    </button>
  );
}
```

`status` is `loading`, `ready`, or `error`. Calls made while loading are buffered in order, up to
100 events; additional calls are dropped until the tracker is ready. Calls are discarded if the
script fails to load. `useVisitoring` must be called under the provider.

The tracker records page views on initial load and common SPA history navigation, including back and
forward. Do not add a second route-change page-view effect unless you disable the tracker's automatic
page views. Visitoring records the pathname only; query strings and fragments are omitted.

Visitoring does not automatically redact page path segments or custom event properties. Do not send
names, email addresses, account IDs, secrets, or other personal or sensitive data in those values.

The `scriptUrl` prop changes the tracker script URL when using a custom Visitoring host. The optional
`endpoint` prop sets the collector URL independently. If neither prop is needed, the default
Visitoring host is used.

The package also declares the existing optional `window.Visitoring` global for TypeScript users of
the plain script integration. Install either the provider or the plain script, not both, on a page.
