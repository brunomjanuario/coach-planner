import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Shared calendar deep-link handling (CAL-04/05/06): reads `paramName` from
 * the URL, strips it immediately so a refresh never reopens the popup, then
 * resolves the target record via `findTarget` and hands off to
 * `onFound`/`onNotFound`. Runs once per distinct search-params value.
 */
export function useDeepLinkPopup({ paramName, findTarget, onFound, onNotFound }) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const value = searchParams.get(paramName);
    if (value == null) return;

    async function resolve() {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete(paramName);
          return next;
        },
        { replace: true }
      );

      const target = await findTarget(value);
      if (!target) {
        onNotFound();
        return;
      }
      onFound(target);
    }

    resolve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
}
