"use client";

import { useId, useState } from "react";
import { dateLabel } from "@/lib/analytics-period";
import { chartInterval, chartMeasures, type ChartMetric } from "./chart-data";
import { formatNumber, type DashboardData } from "./types";
import styles from "../dashboard.module.css";

type Props = {
  buckets: DashboardData["trend"];
  measure: ChartMetric;
  granularity: DashboardData["period"]["granularity"];
  active: number;
  onActive: (index: number) => void;
};

export function TrafficPlot({ buckets, measure, granularity, active, onActive }: Props) {
  const fillId = useId();
  const [focusIndex, setFocusIndex] = useState(Math.max(0, buckets.length - 1));
  const peak = Math.max(
    1,
    ...buckets.flatMap((bucket) => [bucket.current[measure], bucket.previous[measure]]),
  );
  const magnitude = 10 ** Math.floor(Math.log10(peak / 4));
  const step = Math.max(
    1,
    ([1, 2, 5, 10].find((value) => value * magnitude >= peak / 4) ?? 10) * magnitude,
  );
  const maximum = step * 4;
  const x = (index: number) => ((index + 0.5) / Math.max(1, buckets.length)) * 1000;
  const y = (value: number) => 268 - (value / maximum) * 256;
  const points = (period: "current" | "previous") => {
    if (!buckets.length) return "";
    if (buckets.length === 1)
      return `M 0 ${y(buckets[0]?.[period][measure] ?? 0)} L 1000 ${y(buckets[0]?.[period][measure] ?? 0)}`;
    return buckets
      .map((bucket, index) => `${index ? "L" : "M"} ${x(index)} ${y(bucket[period][measure])}`)
      .join(" ");
  };
  const current = points("current");
  const area = current
    ? `${current} L ${buckets.length === 1 ? 1000 : x(buckets.length - 1)} 268 L ${buckets.length === 1 ? 0 : x(0)} 268 Z`
    : "";
  const selected = buckets[active];
  const hourly = granularity === "hour";
  const ticks = [
    ...new Set([0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.floor((buckets.length - 1) * ratio))),
  ].filter((index) => index >= 0);
  const axisNumber = (value: number) =>
    new Intl.NumberFormat("en", {
      notation: value >= 1000 ? "compact" : "standard",
      maximumFractionDigits: 1,
    }).format(value);
  return (
    <>
      <div className={styles.plotLayout}>
        <div className={styles.yAxis} aria-hidden="true">
          {[4, 3, 2, 1, 0].map((tick) => (
            <span key={tick}>{axisNumber(step * tick)}</span>
          ))}
        </div>
        <section className={styles.plot} aria-label={`${chartMeasures[measure]} by ${granularity}`}>
          <svg
            key={measure}
            className={styles.plotDrawing}
            viewBox="0 0 1000 280"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.015" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map((tick) => (
              <line
                key={tick}
                x1="0"
                x2="1000"
                y1={y(step * tick)}
                y2={y(step * tick)}
                className={styles.plotGridline}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={area} fill={`url(#${fillId})`} />
            <path
              d={points("previous")}
              className={styles.previousLine}
              vectorEffect="non-scaling-stroke"
            />
            <path d={current} className={styles.currentLine} vectorEffect="non-scaling-stroke" />
          </svg>
          {selected ? (
            <>
              <span
                className={styles.plotPreviousPoint}
                style={{
                  left: `${x(active) / 10}%`,
                  top: `${(y(selected.previous[measure]) / 280) * 100}%`,
                }}
              />
              <span
                className={styles.plotCurrentPoint}
                style={{
                  left: `${x(active) / 10}%`,
                  top: `${(y(selected.current[measure]) / 280) * 100}%`,
                }}
              />
            </>
          ) : null}
          <div className={styles.plotTargets}>
            {buckets.map((bucket, index) => (
              <button
                key={bucket.from}
                type="button"
                className={styles.plotBucket}
                data-active={index === active || undefined}
                tabIndex={index === Math.min(focusIndex, buckets.length - 1) ? 0 : -1}
                onFocus={() => {
                  setFocusIndex(index);
                  onActive(index);
                }}
                onMouseEnter={() => onActive(index)}
                onClick={() => onActive(index)}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const nextIndex =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? buckets.length - 1
                        : Math.max(
                            0,
                            Math.min(
                              buckets.length - 1,
                              index + (event.key === "ArrowLeft" ? -1 : 1),
                            ),
                          );
                  const next = event.currentTarget.parentElement?.children[nextIndex];
                  if (next instanceof HTMLButtonElement) next.focus();
                }}
                aria-label={`${chartInterval(bucket.from, bucket.to, hourly)}: ${formatNumber(bucket.current[measure])} ${chartMeasures[measure].toLowerCase()}; previous ${chartInterval(bucket.previousFrom, bucket.previousTo, hourly)}: ${formatNumber(bucket.previous[measure])}`}
              />
            ))}
          </div>
        </section>
      </div>
      <div className={styles.xAxis}>
        {ticks.map((index, position) => {
          const bucket = buckets[index];
          if (!bucket) return null;
          return (
            <span
              key={bucket.from}
              className={ticks.length === 5 && position % 2 === 1 ? styles.optionalTick : undefined}
            >
              {hourly
                ? new Intl.DateTimeFormat("en", { hour: "numeric", timeZone: "UTC" }).format(
                    new Date(bucket.from),
                  )
                : dateLabel(bucket.from, false, granularity === "month")}
            </span>
          );
        })}
      </div>
    </>
  );
}
