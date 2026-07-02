import Dashboard from "./components/dashboard";
import { ThemeProvider } from "./components/theme-provider";
import AlbumScreen from "./components/album-screen";
import { Titlebar } from "./components/titlebar";
import { useGridStore } from "./lib/store";

function App() {
  const isAlbumScreenOpen = useGridStore((s) => s.isAlbumScreenOpen);

  // theme provider provides from the index.css
  return (
    <ThemeProvider defaultTheme="prismatic">
      {/* <Titlebar /> */}
      {/* <div className="relative w-full overflow-hidden" style={{ height: "calc(100vh - 32px)" }}> */}
      <div className="relative w-full h-screen overflow-hidden">

        <Dashboard />
        {isAlbumScreenOpen && <AlbumScreen />}
      </div>
    </ThemeProvider>
  );
}

export default App;