"use client";

import { useState } from "react";
import { Tooltip } from "@/app/components/Tooltip";
import styles from "../../settings-page.module.css";

export function SiteKeyDisplay({
  siteKey,
  siteKeyPrefix,
}: {
  siteKey: string | null;
  siteKeyPrefix: string;
}) {
  const [copyResult, setCopyResult] = useState<{
    siteKey: string;
    status: "copied" | "error";
  } | null>(null);
  const copyStatus = copyResult?.siteKey === siteKey ? copyResult.status : "idle";

  async function copyKey() {
    if (!siteKey) return;
    try {
      await navigator.clipboard.writeText(siteKey);
      setCopyResult({ siteKey, status: "copied" });
    } catch {
      setCopyResult({ siteKey, status: "error" });
    }
  }

  return (
    <div className={styles.keySummary}>
      <span>Tracking key</span>
      {siteKey ? (
        <code>{siteKey}</code>
      ) : (
        <span className={styles.keyUnavailable}>
          <code>{siteKeyPrefix}••••••</code>
          <span>Replace this key to view and copy its full value here.</span>
        </span>
      )}
      {siteKey ? (
        <button type="button" className="button buttonQuiet" onClick={copyKey}>
          Copy
        </button>
      ) : null}
      {copyStatus === "copied" ? <span role="status">Copied</span> : null}
      {copyStatus === "error" ? (
        <span role="status">Couldn’t copy. Select the key and copy it manually.</span>
      ) : null}
      <Tooltip
        label="Tracking key"
        content={
          siteKey
            ? "This is a public browser identifier. You can view or copy it here; it does not grant access to your dashboard."
            : "This is a public browser identifier. Replace this older key to view or copy its new value here."
        }
      />
    </div>
  );
}
