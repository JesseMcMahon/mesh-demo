import type { Href } from "expo-router";

interface RouterLike {
  back: () => void;
  canGoBack: () => boolean;
  replace: (href: Href) => void;
  dismissAll: () => void;
}

export function backOrReplace(router: RouterLike, fallbackHref: Href) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallbackHref);
}

export function dismissFlowAndBackOrReplace(
  router: RouterLike,
  fallbackHref: Href
) {
  router.dismissAll();
  backOrReplace(router, fallbackHref);
}
