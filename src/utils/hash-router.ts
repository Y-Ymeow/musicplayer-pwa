import { useEffect, useState } from 'preact/hooks';

function normalizePath(path: string) {
  if (!path) return '/';
  if (path.startsWith('#')) {
    path = path.slice(1);
  }
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  return path || '/';
}

export function getHashPath() {
  if (typeof window === 'undefined') return '/';
  return normalizePath(window.location.hash);
}

export function navigate(path: string) {
  if (typeof window === 'undefined') return;
  const normalized = normalizePath(path);
  if (window.location.hash !== `#${normalized}`) {
    window.location.hash = normalized;
  }
}

export function useHashRoute(defaultPath = '/') {
  const [path, setPath] = useState(() => (typeof window === 'undefined' ? defaultPath : getHashPath()));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    if (!window.location.hash) {
      window.location.hash = normalizePath(defaultPath);
    }

    const handleChange = () => {
      const nextPath = getHashPath();
      setPath(nextPath || normalizePath(defaultPath));
    };

    window.addEventListener('hashchange', handleChange);
    return () => window.removeEventListener('hashchange', handleChange);
  }, [defaultPath]);

  return path;
}
