// Shared route matching for Header and BottomNav active state
export const isRouteActive = (key, pathname = '/') => {
  const path = pathname || '/';
  switch (key) {
    case 'home':
      return path === '/';
    case 'explore':
      if (path === '/meals' || path === '/meals/search') return true;
      if (
        path.startsWith('/meals/') &&
        path !== '/meals/create' &&
        path !== '/meals/history'
      ) {
        return true;
      }
      return false;
    case 'create':
      return path === '/meals/create';
    case 'map':
      return path === '/map' || path.startsWith('/map/');
    case 'mine':
      return path === '/my-meals' || path === '/meals/history';
    case 'profile':
      return path.startsWith('/impostazioni/profilo');
    default:
      return false;
  }
};
