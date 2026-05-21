import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SshConnection } from "../../types";
import { useSshStore } from "../../stores/sshStore";
import { useT } from "../../i18n";

const ENCODINGS = ["UTF-8", "EUC-KR", "CP949", "UTF-16", "UTF-16BE"];

interface FormData {
  alias: string;
  host: string;
  port: string;
  username: string;
  authType: "password" | "key" | "agent";
  password: string;
  keyPath: string;
  passphrase: string;
}

function emptyForm(): FormData {
  return { alias: "", host: "", port: "22", username: "", authType: "password", password: "", keyPath: "", passphrase: "" };
}

function connToForm(c: SshConnection): FormData {
  return { alias: c.alias, host: c.host, port: String(c.port), username: c.username, authType: c.authType, password: c.password ?? "", keyPath: c.keyPath ?? "", passphrase: c.passphrase ?? "" };
}

// ── Add / Edit mode ──────────────────────────────────────────────────────────

interface FormDialogProps {
  initial?: SshConnection;
  onSave: (data: Omit<SshConnection, "id">) => void;
  onClose: () => void;
}

export function SshConnectionFormDialog({ initial, onSave, onClose }: FormDialogProps) {
  const t = useT();
  const [form, setForm] = useState<FormData>(initial ? connToForm(initial) : emptyForm());
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof FormData, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!form.host.trim()) { setError(t("ssh.hostRequired")); return; }
    if (!form.username.trim()) { setError(t("ssh.usernameRequired")); return; }
    const port = parseInt(form.port);
    if (isNaN(port) || port < 1 || port > 65535) { setError(t("ssh.invalidPort")); return; }
    onSave({
      alias: form.alias.trim() || form.host.trim(),
      host: form.host.trim(),
      port,
      username: form.username.trim(),
      authType: form.authType,
      password: form.authType === "password" ? form.password : undefined,
      keyPath: form.authType === "key" ? form.keyPath.trim() : undefined,
      passphrase: form.passphrase.trim() || undefined,
    });
  };

  return (
    <Overlay onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {initial ? t("ssh.editTitle") : t("ssh.addTitle")}
        </div>
        <Field label={t("ssh.alias")}>
          <Input value={form.alias} onChange={(v) => set("alias", v)} placeholder={t("ssh.aliasPlaceholder")} />
        </Field>
        <div className="flex gap-2">
          <Field label={t("ssh.host")} className="flex-1">
            <Input value={form.host} onChange={(v) => set("host", v)} placeholder="example.com" />
          </Field>
          <Field label={t("ssh.port")} className="w-20">
            <Input value={form.port} onChange={(v) => set("port", v)} placeholder="22" />
          </Field>
        </div>
        <Field label={t("ssh.username")}>
          <Input value={form.username} onChange={(v) => set("username", v)} placeholder={t("ssh.usernamePlaceholder")} />
        </Field>
        <Field label={t("ssh.authType")}>
          <select
            className="w-full px-2 py-1 rounded text-xs"
            style={{ backgroundColor: "var(--color-bg-tertiary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
            value={form.authType}
            onChange={(e) => set("authType", e.target.value as FormData["authType"])}
          >
            <option value="password">{t("ssh.authPassword")}</option>
            <option value="key">{t("ssh.authKey")}</option>
            <option value="agent">{t("ssh.authAgent")}</option>
          </select>
        </Field>
        {form.authType === "password" && (
          <Field label={t("ssh.password")}>
            <Input type="password" value={form.password} onChange={(v) => set("password", v)} placeholder={t("ssh.passwordPlaceholder")} />
          </Field>
        )}
        {form.authType === "key" && (
          <Field label={t("ssh.keyPath")}>
            <Input value={form.keyPath} onChange={(v) => set("keyPath", v)} placeholder={t("ssh.keyPathPlaceholder")} />
          </Field>
        )}
        {(form.authType === "key" || form.authType === "agent") && (
          <Field label={t("ssh.passphrase")}>
            <Input type="password" value={form.passphrase} onChange={(v) => set("passphrase", v)} placeholder={t("ssh.passphrasePlaceholder")} />
          </Field>
        )}
        {form.authType === "agent" && (
          <div className="text-xs px-1" style={{ color: "var(--color-text-secondary)" }}>{t("ssh.agentHint")}</div>
        )}
        {error && <div className="text-xs" style={{ color: "#f87171" }}>{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <DialogBtn variant="ghost" onClick={onClose}>{t("ssh.cancel")}</DialogBtn>
          <DialogBtn variant="primary" onClick={handleSave}>{t("ssh.save")}</DialogBtn>
        </div>
      </div>
    </Overlay>
  );
}

// ── Open remote file mode ────────────────────────────────────────────────────

interface OpenDialogProps {
  connection: SshConnection;
  onOpen: (connectionId: string, remotePath: string, encoding: string) => void;
  onClose: () => void;
}

export function SshOpenFileDialog({ connection, onOpen, onClose }: OpenDialogProps) {
  const t = useT();
  const [remotePath, setRemotePath] = useState("");
  const [encoding, setEncoding] = useState("UTF-8");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setConnected } = useSshStore();

  const handleOpen = async () => {
    if (!remotePath.trim()) { setError(t("ssh.remotePathRequired")); return; }
    setIsConnecting(true);
    setError(null);
    try {
      await invoke("ssh_connect", {
        connectionId: connection.id,
        host: connection.host,
        port: connection.port,
        username: connection.username,
        authType: connection.authType,
        password: connection.password ?? null,
        keyPath: connection.keyPath ?? null,
        passphrase: connection.passphrase ?? null,
      });
      setConnected(connection.id, true);
      onOpen(connection.id, remotePath.trim(), encoding);
    } catch (err) {
      setError(typeof err === "string" ? err : t("ssh.connectFailed"));
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{t("ssh.openFileTitle")}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {connection.username}@{connection.host}:{connection.port}
          </div>
        </div>
        <Field label={t("ssh.remotePath")}>
          <Input value={remotePath} onChange={setRemotePath} placeholder={t("ssh.remotePathPlaceholder")} onEnter={handleOpen} />
        </Field>
        <Field label={t("ssh.encoding")}>
          <select
            className="w-full px-2 py-1 rounded text-xs"
            style={{ backgroundColor: "var(--color-bg-tertiary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
            value={encoding}
            onChange={(e) => setEncoding(e.target.value)}
          >
            {ENCODINGS.map((enc) => <option key={enc} value={enc}>{enc}</option>)}
          </select>
        </Field>
        {error && <div className="text-xs" style={{ color: "#f87171" }}>{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <DialogBtn variant="ghost" onClick={onClose}>{t("ssh.cancel")}</DialogBtn>
          <DialogBtn variant="primary" onClick={handleOpen} disabled={isConnecting}>
            {isConnecting ? t("ssh.connecting") : t("ssh.open")}
          </DialogBtn>
        </div>
      </div>
    </Overlay>
  );
}

// ── Shared primitives ────────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1000 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="flex flex-col p-5 rounded-lg"
        style={{ width: 360, backgroundColor: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <label className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", onEnter }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; onEnter?: () => void }) {
  return (
    <input
      type={type}
      className="w-full px-2 py-1 rounded text-xs outline-none"
      style={{ backgroundColor: "var(--color-bg-tertiary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={(e) => { if (e.key === "Enter") onEnter?.(); }}
    />
  );
}

function DialogBtn({ children, onClick, variant, disabled }: { children: React.ReactNode; onClick: () => void; variant: "primary" | "ghost"; disabled?: boolean }) {
  return (
    <button
      className="px-4 py-1.5 rounded text-xs font-medium transition-opacity hover:opacity-80"
      style={{ backgroundColor: variant === "primary" ? "var(--color-accent)" : "var(--color-bg-tertiary)", color: variant === "primary" ? "#fff" : "var(--color-text-secondary)", opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
