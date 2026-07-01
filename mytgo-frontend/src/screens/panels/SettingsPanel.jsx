import React from "react";
import { Settings } from "lucide-react";

import { useTheme } from "../../ui/system.js";
import { Button, Card } from "../../ui/system.js";
import { DetailRows, Panel } from "../../dashboard/shared.jsx";

export default function SettingsPanel() {
  const { themeMode, resolvedTheme, setLight, setDark, setSystem } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Panel title="Ayarlar" icon={Settings}>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/70">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600 dark:text-red-400">Görünüm</p>
          <h3 className="mt-2 text-lg font-black">Tema seçimi</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Bu cihaz için açık veya koyu temayı seçebilirsiniz. Tercih yerel olarak saklanır.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" className="min-w-[8rem]" onClick={setSystem}>
              Sistem
            </Button>
            <Button variant={!isDark ? "primary" : "secondary"} size="sm" className="min-w-[8rem]" onClick={setLight}>
              Açık
            </Button>
            <Button variant={isDark ? "primary" : "secondary"} size="sm" className="min-w-[8rem]" onClick={setDark}>
              Koyu
            </Button>
          </div>
        </Card>

        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/70">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600 dark:text-red-400">Tercihler</p>
          <h3 className="mt-2 text-lg font-black">Mevcut yapı</h3>
          <DetailRows
            rows={[
              ["Tema", themeMode === "system" ? `Sistem (${isDark ? "Koyu" : "Açık"})` : isDark ? "Koyu" : "Açık"],
              ["Kayıt alanı", "Tarayıcı localStorage"],
              ["Kapsam", "Sadece bu cihaz ve bu tarayıcı"],
            ]}
          />
        </Card>
      </div>
    </Panel>
  );
}
