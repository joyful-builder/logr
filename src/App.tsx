import { useEffect } from "react";
import Sidebar from "./components/Sidebar";
import TabBar from "./components/TabBar";
import LogViewer from "./components/LogViewer";
import Toolbar from "./components/Toolbar";
import { useBookmarkStore } from "./stores/bookmarkStore";

export default function App() {
  const { loadBookmarks } = useBookmarkStore();

  // 앱 시작 시 저장된 즐겨찾기 로드
  useEffect(() => {
    loadBookmarks();
  }, []);

  return (
    <div
      className="flex flex-col"
      style={{ height: "100vh", backgroundColor: "var(--color-bg-primary)" }}
    >
      <TabBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <LogViewer />
      </div>
      <Toolbar />
    </div>
  );
}
