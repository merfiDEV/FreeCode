/**
 * Command safety gate. A conservative deny-list so that AI-generated
 * destructive commands are rejected before ever reaching the shell.
 */
const PATTERNS: RegExp[] = [
  /\brm\s+-rf\s+\//i,
  /\bformat\s+[a-z]:/i,
  /\bmkfs\b/i,
  /\bdd\s+if=.*of=\/dev\//i,
  /\b(shutdown|reboot|halt|poweroff)\b/i,
  /:\\>s*[a-z]:\\/i, // cmd wipe
  /\bdel\s+\/f\s+\/s\s+\/q\s+[a-z]:\\/i,
  /\brd\s+\/s\s+\/q\s+[a-z]:\\/i,
  /Remove-Item\s+-Recurse\s+-Force\s+[A-Z]:\\?\s*$/i,
];

export function isDangerousCommand(command: string): boolean {
  return PATTERNS.some((re) => re.test(command));
}
