/* =============================================================================
   00) FILE INDEX
   01) DOMCONTENTLOADED LIFECYCLE
   02) DOM REFERENCES
   03) THEME APPLICATION
   04) INITIAL THEME RESOLUTION
   05) TOGGLE INTERACTION
   06) SYSTEM THEME CHANGE LISTENER
============================================================================= */

/* =============================================================================
   01) DOMCONTENTLOADED LIFECYCLE
============================================================================= */
document.addEventListener("DOMContentLoaded", () => {
    /* =============================================================================
       02) DOM REFERENCES
    ============================================================================= */
    const body = document.body;
    const getToggle = () => document.getElementById("theme-toggle");

    /* =============================================================================
       03) THEME APPLICATION
    ============================================================================= */
    const applyTheme = (theme) => {
        body.classList.remove("dark-mode", "light-mode");
        body.classList.add(theme === "dark" ? "dark-mode" : "light-mode");
        localStorage.setItem("theme", theme);

        const toggle = getToggle();
        if (toggle) {
            toggle.setAttribute("aria-pressed", theme === "dark");
        }
    };

    /* =============================================================================
       04) INITIAL THEME RESOLUTION
    ============================================================================= */
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
        applyTheme(storedTheme);
    } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        applyTheme(prefersDark ? "dark" : "light");
    }

    /* =============================================================================
       05) TOGGLE INTERACTION
    ============================================================================= */
    document.addEventListener("click", (e) => {
        const toggle = e.target.closest("#theme-toggle");
        if (!toggle) return;

        const isDark = body.classList.contains("dark-mode");
        applyTheme(isDark ? "light" : "dark");
    });

    /* =============================================================================
       06) SYSTEM THEME CHANGE LISTENER
    ============================================================================= */
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        if (!localStorage.getItem("theme")) {
            applyTheme(e.matches ? "dark" : "light");
        }
    });
});