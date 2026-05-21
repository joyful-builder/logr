export interface LogLine {
  index: number;
  content: string;
  raw: string;
  level?: "ERROR" | "WARN" | "INFO" | "DEBUG";
  timestamp?: string;
}

export interface HighlightRule {
  pattern: string;
  color: string;
  isRegex: boolean;
}

export interface Tab {
  id: string;
  filePath: string;
  alias: string;
  encoding: string;
  isFollowing: boolean;
  scrollPosition: number;
  highlights: HighlightRule[];
  sshConnectionId?: string;
  hasUnread: boolean;
}

export interface Bookmark {
  id: string;
  filePath: string;
  alias: string;
  encoding: string;
  group?: string;
  lastLine?: number;
  sshConnectionId?: string;
}

export interface SearchResult {
  lineIndex: number;
  content: string;
  matchStart: number;
  matchEnd: number;
}

export interface SshConnection {
  id: string;
  alias: string;
  host: string;
  port: number;
  username: string;
  authType: "password" | "key" | "agent";
  password?: string;
  keyPath?: string;
  passphrase?: string;
}
