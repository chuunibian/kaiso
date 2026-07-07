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
      <div className="flex flex-col w-screen h-screen overflow-hidden bg-background">
        <Titlebar />
        <div className="relative flex-1 min-h-0 w-full overflow-hidden">
          <Dashboard />
          {isAlbumScreenOpen && <AlbumScreen />}
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;