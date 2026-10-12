import { spawn, type ChildProcess } from "node:child_process";
import { buildNext, startNextProduction } from "./next-production";

const port = Number(process.env.PLAYWRIGHT_VISUAL_PORT ?? 3116);
let nextProcess: ChildProcess | undefined;
let shuttingDown = false;

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (nextProcess && nextProcess.exitCode === null) nextProcess.kill("SIGTERM");
  process.exitCode = exitCode;
}

async function main() {
  process.on("SIGINT", () => void shutdown(0));
  process.on("SIGTERM", () => void shutdown(0));
  const env = { ...process.env, NEXT_DIST_DIR: ".next-visual-tests" };
  await buildNext(env, (child) => {
    nextProcess = child;
  });
  if (shuttingDown) return;

  nextProcess = startNextProduction(port, env);
  nextProcess.once("error", () => void shutdown(1));
  nextProcess.once("exit", (code) => void shutdown(code ?? 1));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Visual test server failed.");
  void shutdown(1);
});
