/**
 * Core logic, kept free of I/O so it can be tested directly.
 */

export interface CatOptions {
  /** Prefix each line with its 1-based line number. */
  lineNumbers?: boolean;
}

/**
 * Render file contents the way `cat` would, applying the given options.
 */
export function renderContents(contents: string, options: CatOptions = {}): string {
  if (!options.lineNumbers) return contents;

  const trailingNewline = contents.endsWith("\n");
  const lines = contents.split("\n");
  if (trailingNewline) lines.pop();

  const width = String(lines.length).length;
  const numbered = lines.map(
    (line, index) => `${String(index + 1).padStart(width, " ")}  ${line}`,
  );

  return numbered.join("\n") + (trailingNewline ? "\n" : "");
}
