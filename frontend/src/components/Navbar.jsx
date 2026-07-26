import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";


function Navbar() {
  const { t, i18n } = useTranslation();

  const isArabic =
    i18n.language.startsWith("ar");

  const navClassName = ({ isActive }) =>
    isActive ? "active" : undefined;


  function changeLanguage(language) {
    i18n.changeLanguage(language);
  }


  return (
    <header className="navbar">
      <NavLink to="/" className="brand">
        <span className="brand-wordmark">
          <strong>{t("brand.name")}</strong>

          {t("brand.subtitle") && (
            <small>
              {t("brand.subtitle")}
            </small>
          )}
        </span>
      </NavLink>

      <nav
        className="nav-links"
        aria-label={t("nav.label")}
      >
        <NavLink
          to="/"
          className={navClassName}
        >
          {t("nav.home")}
        </NavLink>

        <NavLink
          to="/map"
          className={navClassName}
        >
          {t("nav.map")}
        </NavLink>

        <NavLink
          to="/compare"
          className={navClassName}
        >
          {t("nav.compare")}
        </NavLink>
      </nav>

      <div
        className="language-switch"
        aria-label={t("language.selector")}
      >
        <button
          type="button"
          className={
            isArabic ? "selected" : ""
          }
          aria-pressed={isArabic}
          aria-label={t("language.arabic")}
          onClick={() =>
            changeLanguage("ar")
          }
        >
          عربي
        </button>

        <button
          type="button"
          className={
            !isArabic ? "selected" : ""
          }
          aria-pressed={!isArabic}
          aria-label={t("language.english")}
          onClick={() =>
            changeLanguage("en")
          }
        >
          EN
        </button>
      </div>
    </header>
  );
}


export default Navbar;
