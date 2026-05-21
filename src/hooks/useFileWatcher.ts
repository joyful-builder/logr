import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { LogLine } from "../types";

interface NewLogLinesPayload {
  path: string;
  lines: LogLine[];
  new_pos: number;
}

export function useFileWatcher(
  filePath: string | null,
  isFollowing: boolean,
  encoding: string,
  onNewLines: (lines: LogLine[]) => void,
  filePosRef: React.MutableRefObject<number>
) {
  const onNewLinesRef = useRef(onNewLines);
  onNewLinesRef.current = onNewLines;

  useEffect(() => {
    if (!filePath || !isFollowing) return;

    let unlisten: UnlistenFn | null = null;
    let cancelled = false;

    const setup = async () => {
      try {
        // follow 재활성화 시 중단 위치 이후 누락된 줄 먼저 보충
        const fromPos = filePosRef.current;
        if (fromPos > 0) {
          const result = await invoke<{ lines: LogLine[]; new_pos: number }>(
            "read_lines_from_pos",
            { path: filePath, fromPos, encoding }
          );
          if (!cancelled) {
            filePosRef.current = result.new_pos;
            if (result.lines.length > 0) {
              onNewLinesRef.current(result.lines);
            }
          }
        }

        if (cancelled) return;

        await invoke("start_watch", {
          path: filePath,
          encoding,
          fromPos: filePosRef.current,
        });

        unlisten = await listen<NewLogLinesPayload>("new_log_lines", (event) => {
          if (event.payload.path === filePath) {
            filePosRef.current = event.payload.new_pos;
            onNewLinesRef.current(event.payload.lines);
          }
        });
      } catch (err) {
        console.error("start_watch 실패:", err);
      }
    };

    setup();

    return () => {
      cancelled = true;
      invoke("stop_watch", { path: filePath }).catch(console.error);
      unlisten?.();
    };
  }, [filePath, isFollowing, encoding]);
}
