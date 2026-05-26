import { usePathname, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useAuthSheet } from '@/providers/auth-sheet';
import { useAuthSession } from '@/providers/auth-session';

const PUBLIC_ROUTE_ROOTS = new Set(['explore', 'stays']);
const PUBLIC_TAB_ROUTES = new Set(['index', 'explore', 'stays']);

export function AuthRouteGate() {
  const segments: readonly string[] = useSegments();
  const pathname = usePathname();
  const { openAuthSheet } = useAuthSheet();
  const { isAuthenticated, isLoading } = useAuthSession();
  const pathSegments = pathname.split('/').filter(Boolean);
  const [routeRoot, routeLeaf] = pathSegments;
  const segmentRoot = String(segments[0] ?? '');
  const segmentLeaf = String(segments[1] ?? '');
  const isRootRoute = pathname === '/' || pathname === '';
  const isPublicRoute =
    isRootRoute ||
    PUBLIC_ROUTE_ROOTS.has(routeRoot ?? '') ||
    PUBLIC_ROUTE_ROOTS.has(segmentRoot) ||
    (segmentRoot === '(tabs)' && (!segmentLeaf || PUBLIC_TAB_ROUTES.has(segmentLeaf))) ||
    (routeRoot === '(tabs)' && (!routeLeaf || PUBLIC_TAB_ROUTES.has(routeLeaf)));

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated && !isPublicRoute) {
      openAuthSheet({
        dismissTo: '/(tabs)/explore',
        initialMode: 'signIn',
        returnTo: pathname || '/(tabs)/explore',
      });
      return;
    }
  }, [isAuthenticated, isLoading, isPublicRoute, openAuthSheet, pathname]);

  return null;
}
