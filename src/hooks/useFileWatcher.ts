import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { LogLine } from "../types";

interface NewLogLinesPayload {
  path: string;
  lines: LogLine[];
}

export function useFileWatcher(
  filePath: string | null,
  isFollowing: boolean,
  encoding: string,
  onNewLines: (lines: LogLine[]) => void
) {
  const onNewLinesRef = useRef(onNewLines);
  onNewLinesRef.current = onNewLines;

  useEffect(() => {
    if (!filePath || !isFollowing) return;

    let unlisten: UnlistenFn | null = null;

    const setup = async () => {
      try {
        await invoke("start_watch", { path: filePath, encoding });
        unlisten = await listen<NewLogLinesPayload>("new_log_lines", (event) => {
          if (event.payload.path === filePath) {
            onNewLinesRef.current(event.payload.lines);
          }
        });
      } catch (err) {
        console.error("start_watch 실패:", err);
      }
    };

    setup();

    return () => {
      invoke("stop_watch", { path: filePath }).catch(console.error);
      unlisten?.();
    };
  }, [filePath, isFollowing, encoding]);
}
