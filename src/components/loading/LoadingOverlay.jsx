import { useSettings } from "../../context/SettingsContext";
import "./loading-overlay.css";

function LoadingOverlay({ show = false }) {
  const { brandName, logoUrl } = useSettings();

  if (!show) return null;

  return (
    <div
      className="loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loading-overlay-box">
        {logoUrl ? (
          <img src={logoUrl} alt={brandName} className="loading-overlay-logo" />
        ) : (
          <strong className="loading-overlay-brand">{brandName}</strong>
        )}
        {/* <p className="loading-overlay-text">{text}</p> */}
      </div>
    </div>
  );
}

export default LoadingOverlay;
