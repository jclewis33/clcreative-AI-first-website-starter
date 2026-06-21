import { useEffect, useMemo, useRef } from "react";
import {
  VisualEditing,
  type HistoryAdapter,
  type HistoryUpdate,
} from "@sanity/visual-editing/react";
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";
import type { ClientPerspective } from "@sanity/client";

function serializePerspective(perspective: ClientPerspective): string {
  return typeof perspective === "string"
    ? perspective
    : JSON.stringify(perspective);
}

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function setPerspectiveCookie(perspective: ClientPerspective): boolean {
  const next = serializePerspective(perspective);
  const current = getCookie(perspectiveCookieName);
  if (current === next) return false;
  document.cookie = `${perspectiveCookieName}=${encodeURIComponent(next)}; path=/; SameSite=None; Secure`;
  return true;
}

function currentUrl() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function applyHistoryUpdate(
  update: Pick<HistoryUpdate, "type" | "url">,
  currentHref: string,
) {
  switch (update.type) {
    case "push":
      if (currentHref !== update.url) window.location.assign(update.url);
      return;
    case "replace":
      if (currentHref !== update.url) window.location.replace(update.url);
      return;
    case "pop":
      window.history.back();
      return;
  }
}

export default function SanityVisualEditing() {
  type Navigate = Parameters<HistoryAdapter["subscribe"]>[0];
  const navigateRef = useRef<Navigate | undefined>(undefined);
  const lastUrlRef = useRef("");

  useEffect(() => {
    const sync = () => {
      const url = currentUrl();
      if (url !== lastUrlRef.current) {
        lastUrlRef.current = url;
        navigateRef.current?.({ type: "push", title: document.title, url });
      }
    };

    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);

    const origPush = window.history.pushState;
    const origReplace = window.history.replaceState;
    window.history.pushState = function (...args) {
      origPush.apply(window.history, args);
      sync();
    };
    window.history.replaceState = function (...args) {
      origReplace.apply(window.history, args);
      sync();
    };

    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
    };
  }, []);

  const history = useMemo<HistoryAdapter>(
    () => ({
      subscribe: (navigate) => {
        navigateRef.current = navigate;
        const url = currentUrl();
        lastUrlRef.current = url;
        navigate({ type: "push", title: document.title, url });
        return () => {
          if (navigateRef.current === navigate) {
            navigateRef.current = undefined;
          }
        };
      },
      update: (update) => {
        applyHistoryUpdate(update, window.location.href);
      },
    }),
    [],
  );

  return (
    <VisualEditing
      history={history}
      portal={true}
      onPerspectiveChange={(perspective) => {
        if (setPerspectiveCookie(perspective)) {
          window.location.reload();
        }
      }}
      refresh={() => {
        return new Promise((resolve) => {
          window.location.reload();
          resolve();
        });
      }}
    />
  );
}
