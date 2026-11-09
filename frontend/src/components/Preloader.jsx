
import { useEffect, useState } from "react";
import { Store } from "lucide-react";

function Preloader({ onComplete }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setExiting(true);
    }, 1400);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 1900);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`preloader ${exiting ? "preloader-exit" : ""}`}>
      <div className="preloader-content">

        <div className="preloader-logo">
          <div className="preloader-ring"></div>
          <div className="preloader-icon">
            <Store size={32} strokeWidth={1.6} />
          </div>
        </div>

        <h1>CRUDIFY</h1>

        <p className="preloader-tagline">
          SMART RETAIL MANAGEMENT
        </p>

        <div className="preloader-progress">
          <div className="preloader-progress-fill"></div>
        </div>

        <p className="preloader-loading">
          Preparing your workspace
          <span className="loading-dots">...</span>
        </p>

      </div>
    </div>
  );
}

export default Preloader;
