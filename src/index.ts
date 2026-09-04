#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { renderContents, type CatOptions } from "./cat.js";

const USAGE = `free-cat - concatenate files and print to stdout

Usage:
  free-cat [options] <file>...

Options:
  -n, --line-numbers   Number the output lines
  -h, --help           Show this help
`;

async function main(argv: string[]): Promise<number> {
  const options: CatOptions = {};
  const files: string[] = [];

  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") {
      process.stdout.write(USAGE);
      return 0;
    } else if (arg === "-n" || arg === "--line-numbers") {
      options.lineNumbers = true;
    } else if (arg.startsWith("-")) {
      process.stderr.write(`free-cat: unknown option: ${arg}\n`);
      return 2;
    } else {
      files.push(arg);
    }
  }

  if (files.length === 0) {
    process.stderr.write(USAGE);
    return 2;
  }

  let exitCode = 0;
  for (const file of files) {
    try {
      const contents = await readFile(file, "utf8");
      process.stdout.write(renderContents(contents, options));
    } catch {
      process.stderr.write(`free-cat: ${file}: No such file or directory\n`);
      exitCode = 1;
    }
  }
  return exitCode;
}

process.exitCode = await main(process.argv.slice(2));
