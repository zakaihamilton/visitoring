import { Tooltip } from "@/app/components/Tooltip";
import styles from "../dashboard.module.css";

export function FilterLabel({
  label,
  htmlFor,
  help,
}: {
  label: string;
  htmlFor: string;
  help: string;
}) {
  return (
    <div className={styles.filterLabel}>
      <label htmlFor={htmlFor}>{label}</label>
      <Tooltip label={label} content={help} />
    </div>
  );
}
