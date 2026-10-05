export function parseArgs(values: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value?.startsWith("--")) continue;
    const key = value.slice(2);
    const next = values[index + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = "true";
    }
  }
  return args;
}

export function requiredArg(args: Record<string, string>, key: string): string {
  const value = args[key]?.trim();
  if (!value) throw new Error(`Missing required --${key} argument.`);
  return value;
}
