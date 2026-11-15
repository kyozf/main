/* ♡xpfm — site script
 *
 * Part 1 runs immediately (this file is loaded in <head>, not deferred) so the
 * warning screen / calm mode are decided BEFORE first paint — no flash of the
 * site for returning visitors.
 * Part 2 runs once the DOM is ready.
 */
(() => {
    "use strict";

    // ───────────── settings you may want to edit ─────────────
    const WARNING_TTL = 10 * 60 * 1000;          // how long "enter site" is remembered
    const RELEASE_DATE = new Date(2026, 11, 11, 0, 0, 0); // new album: dec 11 2026, 00:00 visitor's local time (month is 0-based)
    const ALBUM_URL = "https://krisnyrae.bandcamp.com/album/illusions-elsewhere"; // ？虚像の彼方？
    // ──────────────────────────────────────────────────────────

    const root = document.documentElement;
    const $ = (sel) => document.querySelector(sel);

    // localStorage can throw (private mode, blocked cookies) — never let that break the page
    const store = {
        get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
        set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* ignore */ } },
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isCalm = () => reduceMotion.matches || store.get("calm") === "1";

    function playSound(src) {
        try {
            const audio = new Audio(src);
            const result = audio.play();
            if (result && result.catch) result.catch(() => { /* autoplay blocked — fine */ });
            return audio;
        } catch (e) {
            return null;
        }
    }

    root.classList.add("js");

    const acceptedAt = Number(store.get("warningAccepted"));
    const stillAccepted = acceptedAt && Date.now() - acceptedAt < WARNING_TTL;
    if (!stillAccepted) root.classList.add("gate");

    function applyMotionSetting() {
        const calm = isCalm();
        root.classList.toggle("flicker", !calm);
        root.classList.toggle("calm", calm);

        const toggle = $("#calm-toggle");
        if (toggle) toggle.textContent = calm ? "flicker: off" : "flicker: on";
    }

    root.classList.toggle("flicker", !isCalm());
    root.classList.toggle("calm", isCalm());

    function init() {
        const site = $("#site");
        const warning = $("#warning");
        const main = $("#main");

        applyMotionSetting();
        reduceMotion.addEventListener && reduceMotion.addEventListener("change", applyMotionSetting);

        // ── warning screen ──
        function setGate(locked) {
            if (site) site.inert = locked;       // keep keyboard focus inside the dialog
        }

        if (root.classList.contains("gate") && warning) {
            setGate(true);
            const first = warning.querySelector("button");
            if (first) first.focus();
        }

        function enter(calm) {
            if (calm) store.set("calm", "1");
            store.set("warningAccepted", String(Date.now()));
            root.classList.remove("gate");
            setGate(false);
            applyMotionSetting();
            if (main) main.focus({ preventScroll: true });
        }

        document.querySelectorAll("[data-enter]").forEach((btn) => {
            btn.addEventListener("click", () => enter(btn.dataset.enter === "calm"));
        });

        // ── flicker toggle in the footer ──
        const toggle = $("#calm-toggle");
        if (toggle) {
            if (reduceMotion.matches) {
                toggle.hidden = true;            // browser already asks for reduced motion
            } else {
                toggle.hidden = false;
                toggle.addEventListener("click", () => {
                    store.set("calm", store.get("calm") === "1" ? "0" : "1");
                    applyMotionSetting();
                });
            }
        }

        // ── logo: click sound ──
        const logo = $("#logo");
        if (logo) {
            logo.addEventListener("click", () => playSound("assets/click.mp3"));
        }

        // ── album countdown (index only) ──
        const countdown = $("#countdown");
        if (countdown) {
            const cells = {};
            countdown.querySelectorAll("[data-u]").forEach((el) => { cells[el.dataset.u] = el; });
            const pad = (n) => String(n).padStart(2, "0");
            let timer = null;

            const showReleased = () => {
                clearInterval(timer);
                const status = $("#cd-status");
                if (status) status.textContent = "out now";
                const count = countdown.querySelector(".count");
                if (count) {
                    const link = document.createElement("a");
                    link.href = ALBUM_URL;
                    link.className = "text out-now";
                    link.textContent = "listen on bandcamp →";
                    count.replaceWith(link);
                }
            };

            const tick = () => {
                const ms = RELEASE_DATE.getTime() - Date.now();
                if (ms <= 0) return showReleased();
                const s = Math.floor(ms / 1000);
                cells.d.textContent = pad(Math.floor(s / 86400));
                cells.h.textContent = pad(Math.floor((s % 86400) / 3600));
                cells.m.textContent = pad(Math.floor((s % 3600) / 60));
                cells.s.textContent = pad(s % 60);
            };

            tick();
            timer = setInterval(tick, 1000);
        }

        // ── music page: once the release date has passed, drop the "new / out december 11th" labels ──
        if (Date.now() >= RELEASE_DATE.getTime()) {
            document.querySelectorAll("[data-release-meta]").forEach((el) => { el.textContent = "listen on bandcamp ↗"; });
            document.querySelectorAll("[data-upcoming]").forEach((el) => el.remove());
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();