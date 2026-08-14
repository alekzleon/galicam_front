import { useMemo, useState } from "react"
import {
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  getTranslationValue,
} from "../../utils/adminTranslations"
import "./AdminTranslationsFields.css"

function AdminTranslationsFields({ fields = [], locales = [], translations = {}, onChange }) {
  const activeLocales = useMemo(() => {
    const nextLocales = locales.length ? locales : [DEFAULT_LOCALE]
    return nextLocales.filter((locale, index) => nextLocales.indexOf(locale) === index)
  }, [locales])
  const [activeLocale, setActiveLocale] = useState(activeLocales[0] || DEFAULT_LOCALE)
  const selectedLocale = activeLocales.includes(activeLocale) ? activeLocale : activeLocales[0]

  if (!fields.length || !activeLocales.length) return null

  return (
    <section className="admin-translations">
      <div className="admin-translations__header">
        <div>
          <h4>Traducciones</h4>
          <p>Completa solo los idiomas que necesites. El público usará el texto base si falta una traducción.</p>
        </div>
        <div className="admin-translations__tabs" role="tablist" aria-label="Idiomas de traducción">
          {activeLocales.map((locale) => (
            <button
              key={locale}
              type="button"
              className={selectedLocale === locale ? "is-active" : ""}
              onClick={() => setActiveLocale(locale)}
            >
              {LOCALE_LABELS[locale] || locale.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-translations__grid">
        {fields.map((field) => {
          const value = getTranslationValue(translations, field.name, selectedLocale)
          const Input = field.type === "textarea" ? "textarea" : "input"

          return (
            <label key={`${selectedLocale}-${field.name}`} className="admin-translations__field">
              <span>{field.label}</span>
              <Input
                value={value}
                onChange={(event) => onChange(field.name, selectedLocale, event.target.value)}
                placeholder={field.placeholder || `${field.label} (${LOCALE_LABELS[selectedLocale] || selectedLocale})`}
              />
            </label>
          )
        })}
      </div>
    </section>
  )
}

export default AdminTranslationsFields
