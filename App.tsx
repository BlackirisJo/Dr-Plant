import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AnalysisResultData } from './types';
import { analyzePlantImage } from './services/geminiService';
import { ImageInput } from './components/ImageInput';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { HistorySidebar } from './components/HistorySidebar';
import { LeafIcon } from './components/icons';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { ThemeSwitcher } from './components/ThemeSwitcher';

type Theme = 'light' | 'dark';

const Header: React.FC<{ theme: Theme, onThemeChange: (theme: Theme) => void }> = ({ theme, onThemeChange }) => {
    const { t } = useTranslation();
    return (
        <header className="bg-white dark:bg-gray-800 shadow-md p-4 mb-8">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <LeafIcon className="w-8 h-8 text-green-500 dark:text-green-400 me-3" />
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-wider">{t('headerTitle')}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <ThemeSwitcher theme={theme} onThemeChange={onThemeChange} />
            </div>
          </div>
        </header>
    );
};


function App() {
  const { i18n } = useTranslation();
  const [analyses, setAnalyses] = useState<AnalysisResultData[]>([]);
  const [currentImage, setCurrentImage] = useState<{ base64: string; mimeType: string; dataUrl: string} | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResultData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
      document.documentElement.lang = i18n.language;
      document.documentElement.dir = i18n.dir(i18n.language);
  }, [i18n, i18n.language]);

  useEffect(() => {
    try {
      const savedAnalyses = localStorage.getItem('plantAnalyses');
      if (savedAnalyses) {
        setAnalyses(JSON.parse(savedAnalyses));
      }
    } catch (e) {
      console.error("Failed to load analyses from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('plantAnalyses', JSON.stringify(analyses));
    } catch (e) {
      console.error("Failed to save analyses to localStorage", e);
    }
  }, [analyses]);

  // This effect handles re-analyzing an existing analysis to translate it
  useEffect(() => {
    const translateAnalysisIfNeeded = async () => {
      // Exit if no analysis is selected, if we're already loading, or if the language already matches
      if (!currentAnalysis || isLoading || currentAnalysis.language === i18n.language) {
        return;
      }
      
      // Exit if a new, unanalyzed image is present
      if (currentImage) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Extract base64 and mimeType from the data URL stored in the analysis object
        const match = currentAnalysis.imageUrl.match(/^data:(image\/.*?);base64,(.*)$/);
        if (!match || match.length < 3) {
          throw new Error("Could not parse image data from history for translation.");
        }
        const mimeType = match[1];
        const base64 = match[2];

        // Call the Gemini service with the new language
        const translatedResult = await analyzePlantImage(base64, mimeType, i18n.language);
        
        const updatedAnalysis: AnalysisResultData = {
          ...currentAnalysis,
          ...translatedResult,
          language: i18n.language,
        };

        // Update the currently displayed analysis
        setCurrentAnalysis(updatedAnalysis);
        
        // Update the analysis in the history state to persist the translation
        setAnalyses(prevAnalyses => 
          prevAnalyses.map(a => a.id === updatedAnalysis.id ? updatedAnalysis : a)
        );

      } catch (err: any) {
        setError(err.message || 'An unknown error occurred during translation.');
      } finally {
        setIsLoading(false);
      }
    };

    translateAnalysisIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language, currentAnalysis]);

  const handleImageSelect = useCallback((imageData: { base64: string; mimeType: string }) => {
    setCurrentImage({ ...imageData, dataUrl: `data:${imageData.mimeType};base64,${imageData.base64}` });
    setCurrentAnalysis(null);
    setError(null);
  }, []);

  const handleAnalyzeClick = async () => {
    if (!currentImage) return;

    setIsLoading(true);
    setError(null);
    setCurrentAnalysis(null);

    try {
      const result = await analyzePlantImage(currentImage.base64, currentImage.mimeType, i18n.language);
      const newAnalysis: AnalysisResultData = {
        id: new Date().toISOString(),
        imageUrl: currentImage.dataUrl,
        timestamp: new Date().toISOString(),
        language: i18n.language,
        ...result,
      };
      setCurrentAnalysis(newAnalysis);
      setAnalyses(prev => [newAnalysis, ...prev]);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during analysis.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClear = useCallback(() => {
      setCurrentImage(null);
      setCurrentAnalysis(null);
      setError(null);
  }, []);

  const handleSelectFromHistory = useCallback((analysis: AnalysisResultData) => {
    setCurrentAnalysis(analysis);
    setCurrentImage(null); 
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <Header theme={theme} onThemeChange={setTheme} />
      <main className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-120px)]">
          
          <div className="lg:col-span-1 flex flex-col gap-8">
            <ImageInput 
              onImageSelect={handleImageSelect} 
              onClear={handleClear}
              onAnalyze={handleAnalyzeClick}
              isLoading={isLoading}
              hasImage={!!currentImage}
            />
             <div className="hidden lg:block h-1/2">
                <HistorySidebar analyses={analyses} onSelect={handleSelectFromHistory} currentAnalysisId={currentAnalysis?.id || null} />
            </div>
          </div>

          <div className="lg:col-span-2 h-full">
            <AnalysisDisplay 
              analysis={currentAnalysis} 
              isLoading={isLoading} 
              error={error} 
              imagePreview={currentImage?.dataUrl || currentAnalysis?.imageUrl || null}
              theme={theme}
            />
          </div>
          
           <div className="lg:hidden">
              <HistorySidebar analyses={analyses} onSelect={handleSelectFromHistory} currentAnalysisId={currentAnalysis?.id || null} />
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;