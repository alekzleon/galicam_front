import { useMemo, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useLocalization } from "../../context/LocalizationContext"
import {
  downloadCartExcelLayout,
  importCartExcelFile,
} from "../../services/api/cartService.js"
import { notifyError, notifySuccess, notifyWarning } from "../../utils/toast.js"
import "./cartexcel.css"

function CartExcelImportPage() {
  const { isAuthenticated, sessionReady } = useAuth()
  const { t } = useLocalization()
  const [downloading, setDownloading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [file, setFile] = useState(null)
  const [importResult, setImportResult] = useState(null)

  const importedItems = useMemo(() => {
    return Array.isArray(importResult?.summary?.imported_items)
      ? importResult.summary.imported_items
      : []
  }, [importResult])

  const importErrors = useMemo(() => {
    return Array.isArray(importResult?.summary?.errors)
      ? importResult.summary.errors
      : []
  }, [importResult])

  if (!sessionReady) {
    return (
      <div className="cart_excel_page">
        <div className="cart_excel_shell">
          <div className="cart_excel_empty">
            <h1>{t("loading")}</h1>
            <p>{t("cartExcelPreparing")}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const handleDownloadLayout = async () => {
    try {
      setDownloading(true)

      const response = await downloadCartExcelLayout()
      const blob = new Blob([response.data], {
        type:
          response.headers["content-type"] ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = getFilenameFromHeaders(response.headers) || "layout-carga-carrito.xlsx"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)

      notifySuccess(t("cartExcelLayoutDownloaded"))
    } catch (error) {
      console.error(
        "Error al descargar layout de Excel:",
        error?.response?.data || error
      )
      notifyError(
        error?.response?.data?.message ||
          t("cartExcelLayoutDownloadError")
      )
    } finally {
      setDownloading(false)
    }
  }

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null
    setFile(nextFile)
  }

  const handleImport = async (event) => {
    event.preventDefault()

    if (!file) {
      notifyWarning(t("cartExcelSelectFileWarning"))
      return
    }

    try {
      setImporting(true)
      const response = await importCartExcelFile(file)
      const data = response?.data ?? {}

      setImportResult(data)
      syncCartSummary(data.cart)

      notifySuccess(response?.message || t("cartExcelProcessed"))
    } catch (error) {
      console.error("Error al importar carrito por Excel:", error?.response?.data || error)
      notifyError(
        error?.response?.data?.message ||
          t("cartExcelProcessError")
      )
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="cart_excel_page">
      <div className="cart_excel_shell">
        <header className="cart_excel_header">
          <div>
            <p className="cart_excel_eyebrow">{t("cartExcelEyebrow")}</p>
            <h1 className="cart_excel_title">{t("cartExcelTitle")}</h1>
            <p className="cart_excel_subtitle">
              {t("cartExcelSubtitleStart")} <strong>CargaCarrito</strong> {t("cartExcelSubtitleEnd")}
            </p>
          </div>

          <div className="cart_excel_header_actions">
            <Link to="/carrito" className="btn btn_ghost">
              {t("backToCart")}
            </Link>
          </div>
        </header>

        <div className="cart_excel_layout">
          <section className="cart_excel_main">
            <div className="cart_excel_card">
              <div className="cart_excel_card_head">
                <div>
                  <h2>{t("cartExcelDownloadStep")}</h2>
                  <p>
                    {t("cartExcelLayoutIncludesStart")} <strong>CargaCarrito</strong> {t("cartExcelLayoutIncludesMiddle")}
                    <strong>Inventario</strong> {t("cartExcelLayoutIncludesEnd")}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn_primary"
                  onClick={handleDownloadLayout}
                  disabled={downloading}
                >
                  {downloading ? t("downloading") : t("downloadLayout")}
                </button>
              </div>

              <div className="cart_excel_steps">
                <div className="cart_excel_step">
                  <span>{t("editableSheet")}</span>
                  <strong>CargaCarrito</strong>
                  <small>{t("cartExcelEditableSheetHelp")}</small>
                </div>

                <div className="cart_excel_step">
                  <span>{t("supportSheet")}</span>
                  <strong>Inventario</strong>
                  <small>{t("cartExcelSupportSheetHelp")}</small>
                </div>
              </div>
            </div>

            <form className="cart_excel_card" onSubmit={handleImport}>
              <div className="cart_excel_card_head">
                <div>
                  <h2>{t("cartExcelUploadStep")}</h2>
                  <p>
                    {t("cartExcelUploadText")}
                  </p>
                </div>
              </div>

              <label className="cart_excel_dropzone">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />

                <i className="bi bi-file-earmark-excel" aria-hidden="true" />
                <strong>{file ? file.name : t("cartExcelSelectFile")}</strong>
                <span>
                  {t("cartExcelAllowedFormats")}
                </span>
              </label>

              <div className="cart_excel_form_actions">
                <button
                  type="submit"
                  className="btn btn_primary"
                  disabled={importing || !file}
                >
                  {importing ? t("processing") : t("processCart")}
                </button>

                {file ? (
                  <button
                    type="button"
                    className="btn btn_secondary"
                    onClick={() => setFile(null)}
                    disabled={importing}
                  >
                    {t("removeFile")}
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <aside className="cart_excel_sidebar">
            <div className="cart_excel_card">
              <h2>{t("cartExcelImportInfoTitle")}</h2>

              <ul className="cart_excel_notes">
                <li>{t("cartExcelImportInfoRead")}</li>
                <li>{t("cartExcelImportInfoGroup")}</li>
                <li>{t("cartExcelImportInfoAdd")}</li>
                <li>{t("cartExcelImportInfoRecalculate")}</li>
              </ul>
            </div>

            {importResult ? (
              <div className="cart_excel_card">
                <h2>{t("cartExcelSummaryTitle")}</h2>

                <div className="cart_excel_summary_grid">
                  <div className="cart_excel_summary_item">
                    <span>{t("processedRows")}</span>
                    <strong>{importResult.summary?.processed_rows ?? 0}</strong>
                  </div>
                  <div className="cart_excel_summary_item">
                    <span>{t("importedRows")}</span>
                    <strong>{importResult.summary?.imported_rows ?? 0}</strong>
                  </div>
                  <div className="cart_excel_summary_item">
                    <span>{t("skippedRows")}</span>
                    <strong>{importResult.summary?.skipped_rows ?? 0}</strong>
                  </div>
                  <div className="cart_excel_summary_item">
                    <span>{t("cartItems")}</span>
                    <strong>{importResult.cart?.items_count ?? 0}</strong>
                  </div>
                </div>

                {importedItems.length ? (
                  <div className="cart_excel_result_block">
                    <h3>{t("importedItems")}</h3>

                    <div className="cart_excel_result_list">
                      {importedItems.map((item) => (
                        <article
                          key={`${item.product_id}-${item.sku}`}
                          className="cart_excel_result_item is-success"
                        >
                          <strong>{item.name}</strong>
                          <span>
                            {item.sku} · {t("pieces", { count: item.quantity })}
                          </span>
                          {Array.isArray(item.rows) && item.rows.length ? (
                            <small>{t("rows")}: {item.rows.join(", ")}</small>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                {importErrors.length ? (
                  <div className="cart_excel_result_block">
                    <h3>{t("rejectedRows")}</h3>

                    <div className="cart_excel_result_list">
                      {importErrors.map((error, index) => (
                        <article
                          key={`${error.row}-${error.sku}-${index}`}
                          className="cart_excel_result_item is-error"
                        >
                          <strong>{error.sku || t("noSku")}</strong>
                          <span>{error.message || t("rowImportError")}</span>
                          <small>{t("row")} {error.row || "-"}</small>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="cart_excel_result_footer">
                  <Link to="/carrito" className="btn btn_primary">
                    {t("viewUpdatedCart")}
                  </Link>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  )
}

function getFilenameFromHeaders(headers = {}) {
  const disposition =
    headers["content-disposition"] || headers["Content-Disposition"] || ""

  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1])

  const plainMatch = disposition.match(/filename="?([^"]+)"?/i)
  if (plainMatch?.[1]) return plainMatch[1]

  return ""
}

function syncCartSummary(cartData) {
  const summary = {
    id: cartData?.id ?? null,
    items_count: Number(cartData?.items_count ?? 0),
    subtotal: Number(cartData?.subtotal ?? 0),
    discount: Number(cartData?.discount ?? 0),
    tax: Number(cartData?.tax ?? 0),
    tax_breakdown: cartData?.tax_breakdown ?? null,
    total: Number(cartData?.total ?? 0),
  }

  localStorage.setItem("ecommerce_cart_summary", JSON.stringify(summary))
  window.dispatchEvent(
    new CustomEvent("cart:updated", {
      detail: summary,
    })
  )
}

export default CartExcelImportPage
