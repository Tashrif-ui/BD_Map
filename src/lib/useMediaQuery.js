/*!
 * BD-Map — https://github.com/Tashrif-ui/BD_Map
 * © 2026 Tashrif Alam. Licensed under CC BY-NC-SA 4.0 (non-commercial). Keep this notice.
 */
import { useEffect, useState } from 'react';

// Phones (portrait and landscape) and small tablets use the drawer + sheet layout.
// Keep in sync with the matching @media rule in styles/theme.css.
export const MOBILE_QUERY = '(max-width: 820px), (max-height: 500px) and (max-width: 1000px)';

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
