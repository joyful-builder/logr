import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useBookmarkStore } from "../../stores/bookmarkStore";
import { useTabStore } from "../../stores/tabStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useSshStore } from "../../stores/sshStore";
import { SshConnection } from "../../types";
import { SshConnectionFormDialog, SshOpenFileDialog } from "../SshConnectDialog";
import { useT } from "../../i18n";

type SshDialog =
  | { type: "add" }
  | { type: "edit"; connection: SshConnection }
  | { type: "open"; connection: SshConnection };

export default function Sidebar() {
  const t = useT();
  const { bookmarks, addBookmark, removeBookmark } = useBookmarkStore();
  const { addTab, getActiveTab } = useTabStore();
  const { defaultEncoding } = useSettingsStore();
  const { connections, addConnection, updateConnection, removeConnection, connectedIds, setConnected } = useSshStore();
  const activeTab = getActiveTab();

  const [sshDialog, setSshDialog] = useState<SshDialog | null>(null);
  const [connectingBmId, setConnectingBmId] = useState<string | null>(null);

  const handleOpenFile = async () => {
    const selected = await open({ multiple: true });
    const paths = Array.isArray(selected) ? selected : selected ? [selected] : [];
    for (const filePath of paths) {
      const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
      let encoding = defaultEncoding;
      try { encoding = await invoke<string>("detect_encoding", { path: filePath }); } catch {}
      addTab({ filePath, alias: fileName, encoding, isFollowing: true });
    }
  };

  const handleAddBookmark = async () => {
    if (!activeTab) return;
    const alreadyExists = bookmarks.some(
      (b) => b.filePath === activeTab.filePath && b.sshConnectionId === activeTab.sshConnectionId
    );
    if (alreadyExists) return;
    await addBookmark({
      filePath: activeTab.filePath,
      alias: activeTab.alias,
      encoding: activeTab.encoding,
      sshConnectionId: activeTab.sshConnectionId,
    });
  };

  const handleOpenBookmark = async (bmId: string, filePath: string, alias: string, encoding: string, sshConnectionId?: string) => {
    if (!sshConnectionId) {
      addTab({ filePath, alias, encoding, isFollowing: true });
      return;
    }
    const conn = connections.find((c) => c.id === sshConnectionId);
    if (!conn) {
      // 연결 정보가 삭제된 경우
      alert(`SSH 접속 정보를 찾을 수 없습니다 (id: ${sshConnectionId})`);
      return;
    }
    setConnectingBmId(bmId);
    try {
      await invoke("ssh_connect", {
        connectionId: conn.id,
        host: conn.host,
        port: conn.port,
        username: conn.username,
        authType: conn.authType,
        password: conn.password ?? null,
        keyPath: conn.keyPath ?? null,
        passphrase: conn.passphrase ?? null,
      });
      setConnected(conn.id, true);
      addTab({ filePath, alias, encoding, isFollowing: true, sshConnectionId });
    } catch (err) {
      alert(`SSH 연결 실패: ${err}`);
    } finally {
      setConnectingBmId(null);
    }
  };

  const handleSshSave = async (data: Omit<SshConnection, "id">) => {
    if (sshDialog?.type === "edit") {
      await updateConnection(sshDialog.connection.id, data);
    } else {
      await addConnection(data);
    }
    setSshDialog(null);
  };

  const handleSshOpen = (connectionId: string, remotePath: string, encoding: string) => {
    const conn = connections.find((c) => c.id === connectionId);
    if (!conn) return;
    const fileName = remotePath.split("/").pop() ?? remotePath;
    addTab({ filePath: remotePath, alias: `${conn.alias} › ${fileName}`, encoding, isFollowing: true, sshConnectionId: connectionId });
    setSshDialog(null);
  };

  const isCurrentBookmarked = activeTab
    ? bookmarks.some((b) => b.filePath === activeTab.filePath && b.sshConnectionId === activeTab.sshConnectionId)
    : false;

  return (
    <aside
      className="flex flex-col h-full border-r"
      style={{ width: 220, minWidth: 220, backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
    >
      {/* ── 즐겨찾기 ── */}
      <div
        className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider shrink-0"
        style={{ color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}
      >
        <span>{t("sidebar.bookmarks")}</span>
        <button
          className="hover:opacity-80 transition-opacity text-sm"
          style={{
            color: isCurrentBookmarked ? "var(--color-text-secondary)" : "var(--color-accent)",
            cursor: activeTab && !isCurrentBookmarked ? "pointer" : "default",
            opacity: activeTab && !isCurrentBookmarked ? 1 : 0.4,
          }}
          onClick={handleAddBookmark}
          title={
            !activeTab ? t("sidebar.openFileFirst")
            : isCurrentBookmarked ? t("sidebar.alreadyBookmarked")
            : t("sidebar.addBookmark")
          }
          disabled={!activeTab || isCurrentBookmarked}
        >
          ★
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {bookmarks.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <span style={{ fontSize: 24 }}>📌</span>
            <span>{t("sidebar.noBookmarks")}</span>
            <span>{t("sidebar.noBookmarksHint")}</span>
          </div>
        ) : (
          <ul className="py-1">
            {bookmarks.map((bm) => {
              const isConnecting = connectingBmId === bm.id;
              const sshConn = bm.sshConnectionId ? connections.find((c) => c.id === bm.sshConnectionId) : null;
              return (
                <li key={bm.id} className="group flex items-center">
                  <button
                    className="flex-1 text-left px-3 py-2 text-xs truncate hover:opacity-80 transition-opacity min-w-0"
                    style={{ color: isConnecting ? "var(--color-text-secondary)" : "var(--color-text-primary)", backgroundColor: "transparent" }}
                    onClick={() => handleOpenBookmark(bm.id, bm.filePath, bm.alias, bm.encoding, bm.sshConnectionId)}
                    title={bm.sshConnectionId ? `[SSH] ${sshConn ? `${sshConn.host}:` : ""}${bm.filePath}` : bm.filePath}
                    disabled={isConnecting}
                  >
                    <div className="flex items-center gap-1 truncate font-medium">
                      {bm.sshConnectionId && (
                        <span style={{ color: "var(--color-accent)", fontSize: 9, opacity: 0.8, flexShrink: 0 }}>SSH</span>
                      )}
                      <span className="truncate">
                        {isConnecting ? "연결 중…" : (bm.alias || bm.filePath.split(/[\\/]/).pop())}
                      </span>
                    </div>
                    {bm.sshConnectionId && sshConn && (
                      <div className="truncate pl-0" style={{ color: "var(--color-text-secondary)", fontSize: 10 }}>
                        {sshConn.host}
                      </div>
                    )}
                    {!bm.sshConnectionId && bm.group && (
                      <div className="truncate text-xs" style={{ color: "var(--color-text-secondary)" }}>{bm.group}</div>
                    )}
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 px-2 transition-opacity text-xs shrink-0"
                    style={{ color: "var(--color-text-secondary)" }}
                    onClick={() => removeBookmark(bm.id)}
                    title={t("sidebar.removeBookmark")}
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── SSH 접속 ── */}
      <div className="shrink-0" style={{ borderTop: "1px solid var(--color-border)" }}>
        <div
          className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <span>{t("sidebar.ssh")}</span>
          <button
            className="hover:opacity-100 transition-opacity"
            style={{ color: "var(--color-accent)", opacity: 0.8, fontSize: 16, lineHeight: 1 }}
            onClick={() => setSshDialog({ type: "add" })}
            title={t("sidebar.addSshConnection")}
          >
            +
          </button>
        </div>
        {connections.length === 0 ? (
          <div className="px-3 pb-3 text-xs" style={{ color: "var(--color-text-secondary)", opacity: 0.6 }}>
            {t("sidebar.noSshConnections")}
          </div>
        ) : (
          <ul className="pb-1" style={{ maxHeight: 140, overflowY: "auto" }}>
            {connections.map((conn) => {
              const isConnected = connectedIds.has(conn.id);
              return (
                <li key={conn.id} className="group flex items-center">
                  <button
                    className="flex-1 text-left px-3 py-1.5 text-xs truncate hover:opacity-80 transition-opacity min-w-0"
                    style={{ color: "var(--color-text-primary)" }}
                    onClick={() => setSshDialog({ type: "open", connection: conn })}
                    title={`${conn.username}@${conn.host}:${conn.port}`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, backgroundColor: isConnected ? "#4ade80" : "var(--color-border)" }} />
                      <span className="truncate font-medium">{conn.alias}</span>
                    </div>
                    <div className="truncate pl-4" style={{ color: "var(--color-text-secondary)", fontSize: 10 }}>{conn.host}</div>
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center shrink-0 pr-1 gap-0.5 transition-opacity">
                    <button className="p-1 text-xs hover:opacity-80" style={{ color: "var(--color-text-secondary)" }} onClick={() => setSshDialog({ type: "edit", connection: conn })} title={t("sidebar.edit")}>✎</button>
                    <button className="p-1 text-xs hover:opacity-80" style={{ color: "var(--color-text-secondary)" }} onClick={() => removeConnection(conn.id)} title={t("sidebar.delete")}>✕</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── 파일 열기 버튼 ── */}
      <div className="p-3" style={{ borderTop: "1px solid var(--color-border)" }}>
        <button
          className="w-full text-xs py-2 px-3 rounded transition-opacity hover:opacity-80 font-medium"
          style={{ backgroundColor: "var(--color-accent)", color: "#ffffff" }}
          onClick={handleOpenFile}
        >
          {t("sidebar.openFile")}
        </button>
      </div>

      {/* ── 다이얼로그 ── */}
      {sshDialog && sshDialog.type !== "open" && (
        <SshConnectionFormDialog
          initial={sshDialog.type === "edit" ? sshDialog.connection : undefined}
          onSave={handleSshSave}
          onClose={() => setSshDialog(null)}
        />
      )}
      {sshDialog && sshDialog.type === "open" && (
        <SshOpenFileDialog
          connection={sshDialog.connection}
          onOpen={handleSshOpen}
          onClose={() => setSshDialog(null)}
        />
      )}
    </aside>
  );
}
