import PropDrilling from './components/PropDrilling';
import Settings from './components/Settings';
import { FavoritesPanel, TemplateList } from './components/Templates';
import { FavoritesProvider } from './context/FavoritesContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';

// Three providers wrap the tree once, any component below reads the state with a hook.
export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <FavoritesProvider>
          <main className="app">
            <h1>DSLKit</h1>
            <Settings />
            <TemplateList />
            <FavoritesPanel />
            <PropDrilling userName="Ксения" />
          </main>
        </FavoritesProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
