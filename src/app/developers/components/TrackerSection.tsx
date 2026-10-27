"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { Tooltip } from "@/app/components/Tooltip";
import { CustomEventsSection } from "./GuideSections";
import {
  eventSnippet,
  nextRootSnippet,
  reactEventSnippet,
  reactRootSnippet,
  trackerSnippet,
} from "./tracker-snippets";
import styles from "../developers.module.css";

const integrationTabs = [
  { id: "standard", label: "Standard website" },
  { id: "react", label: "React app" },
] as const;

type IntegrationTab = (typeof integrationTabs)[number]["id"];

export function TrackerSection({ numbered = true }: { numbered?: boolean }) {
  const [activeTab, setActiveTab] = useState<IntegrationTab>("standard");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % integrationTabs.length;
    if (event.key === "ArrowLeft")
      nextIndex = (currentIndex - 1 + integrationTabs.length) % integrationTabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = integrationTabs.length - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    const nextTab = integrationTabs[nextIndex];
    if (!nextTab) return;
    setActiveTab(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <>
      <section id="tracker" className={styles.section} aria-labelledby="tracker-heading">
        <div
          className={
            numbered
              ? styles.sectionHeading
              : styles.sectionHeading + " " + styles.sectionHeadingNoNumber
          }
        >
          {numbered ? <span aria-hidden="true">02</span> : null}
          <div>
            <div className={styles.sectionTitleRow}>
              <h2 id="tracker-heading">
                {numbered ? "Add the tracker" : "Choose your integration"}
              </h2>
              <Tooltip
                label="Tracker integrations"
                content="Choose either the standard script or the React package for a page. Do not install both."
              />
            </div>
            <p>Choose the setup that matches how your website is built.</p>
          </div>
        </div>

        <div className={styles.integrationTabs} role="tablist" aria-label="Website type">
          {integrationTabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              id={tab.id + "-integration-tab"}
              role="tab"
              aria-controls={tab.id + "-integration-panel"}
              aria-selected={activeTab === tab.id}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={styles.integrationTab}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          id="standard-integration-panel"
          role="tabpanel"
          aria-labelledby="standard-integration-tab"
          hidden={activeTab !== "standard"}
          className={styles.integrationPanel}
        >
          <div className={styles.integrationContent}>
            <div>
              <div className={styles.integrationPanelHeading}>
                <h3>Install the tracker</h3>
                <Tooltip
                  label="Tracker script"
                  content="The deferred script records page views and exposes the custom event API after it loads."
                />
              </div>
              <p className={styles.note}>
                Add this snippet to each page you want to measure. Replace the sample key with the
                tracking key shown in Settings → Sites.
              </p>
              <pre className={styles.codeBlock}>
                <code>{trackerSnippet}</code>
              </pre>
              <p className={styles.note}>
                If Visitoring has a custom address, replace <code>visitoring.vercel.app</code> too.
              </p>
            </div>
            {!numbered && (
              <div>
                <div className={styles.integrationPanelHeading}>
                  <h3>Record a custom event</h3>
                  <Tooltip
                    label="Custom event"
                    content="Send a custom event after your app confirms an action such as a signup."
                  />
                </div>
                <p className={styles.note}>
                  Call this from the success handler after your app confirms the action. Do not
                  include personal or sensitive data in the page path or event properties;
                  Visitoring does not automatically redact those values. The deferred tracker must
                  finish loading before this API is called.
                </p>
                <pre className={styles.codeBlock}>
                  <code>{eventSnippet}</code>
                </pre>
              </div>
            )}
          </div>
        </div>

        <div
          id="react-integration-panel"
          role="tabpanel"
          aria-labelledby="react-integration-tab"
          hidden={activeTab !== "react"}
          className={styles.integrationPanel}
        >
          <div className={styles.integrationContent}>
            <div>
              <div className={styles.integrationPanelHeading}>
                <h3>Use the React package</h3>
                <Tooltip
                  label="React library"
                  content="The package supports React 18 and 19. VisitoringProvider and useVisitoring are its public React APIs."
                />
              </div>
              <p className={styles.note}>
                The <code>visitoring</code> library supports React 18 and 19.{" "}
                <code>VisitoringProvider</code> loads the tracker once and buffers up to 100 events
                while it loads. <code>useVisitoring()</code> exposes a typed <code>track</code>{" "}
                function and <code>loading</code>, <code>ready</code>, or <code>error</code> status.{" "}
                <Link
                  href="https://www.npmjs.com/package/visitoring"
                  target="_blank"
                  rel="noreferrer"
                >
                  View the package on npm
                </Link>
                .
              </p>
              <pre className={styles.codeBlock}>
                <code>npm install visitoring</code>
              </pre>
            </div>
            <div>
              <div className={styles.integrationPanelHeading}>
                <h3>Wrap your app once</h3>
              </div>
              <p className={styles.note}>
                For Vite or React Router, put the provider above your app or router:
              </p>
              <pre className={styles.codeBlock}>
                <code>{reactRootSnippet}</code>
              </pre>
              <p className={styles.note}>
                For Next.js App Router, put the provider in your root layout and set{" "}
                <code>NEXT_PUBLIC_VISITORING_SITE_KEY</code> in the environment:
              </p>
              <pre className={styles.codeBlock}>
                <code>{nextRootSnippet}</code>
              </pre>
            </div>
            {!numbered && (
              <div>
                <div className={styles.integrationPanelHeading}>
                  <h3>Track an action</h3>
                </div>
                <p className={styles.note}>
                  Use the hook from a client component after an action succeeds. Do not include
                  personal or sensitive data in the page path or event properties; Visitoring does
                  not automatically redact those values:
                </p>
                <pre className={styles.codeBlock}>
                  <code>{reactEventSnippet}</code>
                </pre>
              </div>
            )}
          </div>
        </div>

        <p className={styles.integrationBehavior}>
          Visitoring records page views on initial load and when a single-page app changes pages,
          including back and forward navigation. It records the pathname only, omitting query
          strings and fragments. Don’t add a second route-change page-view effect.
        </p>
      </section>
      {numbered && <CustomEventsSection integration={activeTab} />}
    </>
  );
}
