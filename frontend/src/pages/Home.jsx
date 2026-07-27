import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import heroIllustration from
  "../assets/advertising-location-hero.svg";


const FEATURE_KEYS = [
  "live",
  "spatial",
  "comparison",
];


function Home() {
  const { t } = useTranslation();

  return (
    <main>
      <section className="hero section">
        <div className="hero-content">
          <span className="eyebrow">
            {t("home.eyebrow")}
          </span>

          <h1>{t("home.title")}</h1>

          <p className="hero-description">
            {t("home.description")}
          </p>

          <div className="hero-actions">
            <Link
              to="/map"
              className="button button-primary"
            >
              {t("home.analyzeCta")}
            </Link>

            <Link
              to="/compare"
              className="button button-secondary"
            >
              {t("home.compareCta")}
            </Link>
          </div>

          <div className="hero-proof">
            <span>{t("home.realData")}</span>
            <span>{t("home.bilingual")}</span>
            <span>{t("home.noEstimatesHidden")}</span>
          </div>
        </div>

        <div className="hero-visual">
          <img
            src={heroIllustration}
            alt={t("home.illustrationAlt")}
          />

          <div className="hero-data-card hero-data-card--score">
            <span>{t("home.scoreRangeLabel")}</span>
            <strong>0–100</strong>
            <small>{t("home.scoreRangeNote")}</small>
          </div>

          <div className="hero-data-card hero-data-card--live">
            <span className="live-dot" />
            {t("home.liveContext")}
          </div>
        </div>
      </section>

      <section className="section feature-section">
        <div className="section-heading">
          <span className="eyebrow">
            {t("home.featuresEyebrow")}
          </span>
          <h2>{t("home.featuresTitle")}</h2>
          <p>{t("home.featuresDescription")}</p>
        </div>

        <div className="features-grid">
          {FEATURE_KEYS.map((feature, index) => (
            <article
              className="feature-card"
              key={feature}
            >
              <span className="feature-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div
                className={`feature-symbol feature-symbol--${feature}`}
                aria-hidden="true"
              >
                {feature === "live"
                  ? "≋"
                  : feature === "spatial"
                    ? "⌖"
                    : "A↔B"}
              </div>
              <h3>
                {t(`home.features.${feature}.title`)}
              </h3>
              <p>
                {t(`home.features.${feature}.text`)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="section intelligence-section">
        <div className="section-heading">
          <span className="eyebrow">
            {t("home.intelligenceEyebrow")}
          </span>
          <h2>{t("home.intelligenceTitle")}</h2>
          <p>{t("home.intelligenceDescription")}</p>
        </div>

        <div className="intelligence-grid">
          <article className="intelligence-card intelligence-card--satellite">
            <div className="intelligence-card-heading">
              <span
                className="intelligence-symbol"
                aria-hidden="true"
              >
                ◉
              </span>
              <div>
                <small>
                  {t("home.satelliteBadge")}
                </small>
                <h3>
                  {t("home.satelliteTitle")}
                </h3>
              </div>
            </div>

            <p>{t("home.satelliteDescription")}</p>

            <ul>
              <li>{t("home.satelliteImage")}</li>
              <li>{t("home.satelliteModel")}</li>
              <li>{t("home.satelliteEngine")}</li>
            </ul>
          </article>

          <article className="intelligence-card intelligence-card--assistant">
            <div className="intelligence-card-heading">
              <span
                className="intelligence-symbol"
                aria-hidden="true"
              >
                AI
              </span>
              <div>
                <small>
                  {t("home.assistantBadge")}
                </small>
                <h3>
                  {t("home.assistantTitle")}
                </h3>
              </div>
            </div>

            <p>{t("home.assistantDescription")}</p>

            <ul>
              <li>{t("home.assistantSuitability")}</li>
              <li>{t("home.assistantFactors")}</li>
              <li>{t("home.assistantScope")}</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section methodology-section">
        <div>
          <span className="eyebrow">
            {t("home.methodEyebrow")}
          </span>
          <h2>{t("home.methodTitle")}</h2>
          <p>{t("home.methodDescription")}</p>
        </div>

        <div className="method-flow">
          <article>
            <span>01</span>
            <strong>OpenStreetMap</strong>
            <small>{t("home.methodOsm")}</small>
          </article>

          <span className="method-connector" aria-hidden="true">
            +
          </span>

          <article>
            <span>02</span>
            <strong>TomTom</strong>
            <small>{t("home.methodTomtom")}</small>
          </article>

          <span className="method-connector" aria-hidden="true">
            =
          </span>

          <article className="method-score">
            <span>03</span>
            <strong>{t("map.score")}</strong>
            <small>{t("home.methodScore")}</small>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="cta-card">
          <div>
            <span className="eyebrow">
              {t("home.ctaEyebrow")}
            </span>
            <h2>{t("home.ctaTitle")}</h2>
          </div>

          <Link
            to="/map"
            className="button button-light"
          >
            {t("home.analyzeCta")}
          </Link>
        </div>
      </section>
    </main>
  );
}


export default Home;
