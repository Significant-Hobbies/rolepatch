'use client';

import { useEffect, useState } from 'react';

interface Settings {
  baseURL: string;
  apiKey: string;
  model: string;
}

const DEFAULT_SETTINGS: Settings = {
  baseURL: 'https://free-ai-gateway.sarthakagrawal927.workers.dev/v1',
  apiKey: '',
  model: 'auto',
};

const STORAGE_KEY = 'ai-settings';

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setSettings({
          baseURL: parsed.baseURL || DEFAULT_SETTINGS.baseURL,
          apiKey: parsed.apiKey || '',
          model: parsed.model || 'auto',
        });
      } catch {
        // ignore corrupt data
      }
    }
  }, []);

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">Base URL</label>
        <input
          type="text"
          value={settings.baseURL}
          onChange={(e) => {
            setSettings((prev) => ({ ...prev, baseURL: e.target.value }));
            setSaved(false);
          }}
          placeholder="https://api.openai.com/v1"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
        />
        <p className="text-xs text-gray-500 mt-1">Any OpenAI-compatible API endpoint</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">API Key</label>
        <input
          type="password"
          value={settings.apiKey}
          onChange={(e) => {
            setSettings((prev) => ({ ...prev, apiKey: e.target.value }));
            setSaved(false);
          }}
          placeholder="sk-..."
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Model</label>
        <input
          type="text"
          value={settings.model}
          onChange={(e) => {
            setSettings((prev) => ({ ...prev, model: e.target.value }));
            setSaved(false);
          }}
          placeholder="auto"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
        />
      </div>

      <button
        onClick={handleSave}
        className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 text-sm font-medium transition-colors"
      >
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
