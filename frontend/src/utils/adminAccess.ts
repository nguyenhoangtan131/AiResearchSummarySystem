export type AdminLikeUser = {
  email?: string;
  tier?: string;
};

const normalize = (value?: string | null) => (value || '').trim().toLowerCase();

export const hasExplicitAdminAccess = (user: AdminLikeUser | null | undefined) => {
  if (!user) {
    return false;
  }

  return (
    normalize(user.tier) === 'admin'
  );
};

export const hasAnyAuthorizationField = (user: AdminLikeUser | null | undefined) => {
  if (!user) {
    return false;
  }

  return Boolean(
    user.tier !== undefined,
  );
};

export const canShowAdminUiDuringBootstrap = (
  user: AdminLikeUser | null | undefined,
) => {
  if (!user) {
    return false;
  }

  return hasExplicitAdminAccess(user);
};
