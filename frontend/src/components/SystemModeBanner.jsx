import {
  useEffect,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import { getHealth } from "../services/api";


export default function SystemModeBanner() {
  const { t } = useTranslation();
  const [health, setHealth] =
    useState(null);
  const [backendUnavailable,
    setBackendUnavailable] = useState(false);

  useEffect(() => {
    const controller =
      new AbortController();

    getHealth({
      signal: controller.signal,
    })
      .then((result) => {
        setHealth(result);
        setBackendUnavailable(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        if (
          error?.code !== "TIMEOUT"
          && error?.code !== "NETWORK_ERROR"
        ) {
          return;
        }

        setBackendUnavailable(true);
      });

    return () => controller.abort();
  }, []);

  if (
    !backendUnavailable
    && health?.mode !== "demo"
  ) {
    return null;
  }

  const isDemo =
    health?.mode === "demo";

  return (
    <aside
      className={
        "system-mode-banner "
        + (
          isDemo
            ? "system-mode-banner--demo"
            : "system-mode-banner--error"
        )
      }
      role={isDemo ? "status" : "alert"}
    >
      <span
        className="system-mode-badge"
        aria-hidden="true"
      >
        {isDemo ? "Demo" : "!"}
      </span>

      <div>
        <strong>
          {isDemo
            ? t("system.demoTitle")
            : t(
                "system.backendUnavailableTitle",
              )}
        </strong>
        <p>
          {isDemo
            ? t("system.demoDescription")
            : t(
                "system.backendUnavailableDescription",
              )}
        </p>
      </div>
    </aside>
  );
}
