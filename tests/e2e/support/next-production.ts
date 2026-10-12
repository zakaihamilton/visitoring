import { readFile, writeFile } from "node:fs/promises";
import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

const nextExecutable = resolve("node_modules/next/dist/bin/next");
const generatedTypeFiles = ["tsconfig.json", "next-env.d.ts"];

function startNext(args: string[], env: NodeJS.ProcessEnv): ChildProcess {
  return spawn(process.execPath, [nextExecutable, ...args], {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });
}

export async function buildNext(
  env: NodeJS.ProcessEnv,
  onProcess: (child: ChildProcess | undefined) => void,
): Promise<void> {
  const originals = await Promise.all(
    generatedTypeFiles.map(async (path) => [path, await readFile(resolve(path))] as const),
  );
  const child = startNext(["build"], env);
  onProcess(child);

  try {
    const exitCode = await new Promise<number>((resolveExit, rejectExit) => {
      child.once("error", rejectExit);
      child.once("exit", (code) => resolveExit(code ?? 1));
    });
    if (exitCode !== 0) throw new Error(`Next.js build failed with exit code ${exitCode}.`);
  } finally {
    onProcess(undefined);
    await Promise.all(originals.map(([path, contents]) => writeFile(resolve(path), contents)));
  }
}

export function startNextProduction(port: number, env: NodeJS.ProcessEnv): ChildProcess {
  return startNext(["start", "--hostname", "127.0.0.1", "--port", String(port)], env);
}
