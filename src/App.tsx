import Dashboard from "./components/dashboard";
import { ThemeProvider } from "./components/theme-provider";

function App() {
  // Theme provider looks into the index.css for its themes
  return (
    <ThemeProvider defaultTheme="prismatic">
      <Dashboard />
    </ThemeProvider>
  );
}

export default App;
