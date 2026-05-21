import { useEffect, useRef, MutableRefObject } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { LogLine } from "../types";

interface NewLogLinesPayload {
  path: string;
  lines: LogLine[];
  new_pos: number;
}

export function useSshWatcher(
  connectionId: string | null,
  remotePath: string | null,
  isFollowing: boolean,
  encoding: string,
  onNewLines: (lines: LogLine[]) => void,
  filePosRef: MutableRefObject<number>
) {
  const onNewLinesRef = useRef(onNewLines);
  onNewLinesRef.current = onNewLines;

  useEffect(() => {
    if (!connectionId || !remotePath || !isFollowing) return;

    const eventPath = `ssh://${connectionId}:${remotePath}`;
    let unlisten: UnlistenFn | null = null;
    let cancelled = false;

    const setup = async () => {
      try {
        await invoke("ssh_start_watch", {
          connectionId,
          remotePath,
          encoding,
          fromPos: filePosRef.current,
        });

        unlisten = await listen<NewLogLinesPayload>("new_log_lines", (event) => {
          if (!cancelled && event.payload.path === eventPath) {
            onNewLinesRef.current(event.payload.lines);
          }
        });
      } catch (err) {
        console.error("ssh_start_watch 실패:", err);
      }
    };

    setup();

    return () => {
      cancelled = true;
      invoke("ssh_stop_watch", { connectionId, remotePath }).catch(console.error);
      // Snapshot current file size so next resume can catch up from here
      invoke<number>("ssh_get_file_size", { connectionId, remotePath })
        .then((size) => { filePosRef.current = size; })
        .catch(console.error);
      unlisten?.();
    };
  }, [connectionId, remotePath, isFollowing, encoding]);
}
