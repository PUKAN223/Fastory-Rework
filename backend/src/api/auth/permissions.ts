import { authSessionStore } from "./sessionStore";
import { prisma } from "../../db/client";

type PermissionMap = Record<string, boolean>;
type NestedPermissionMap = Record<string, boolean | Record<string, boolean>>;

export const getAccessToken = (authorization?: string) => {
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
};

export const getAuthSession = (authorization?: string) => {
  const token = getAccessToken(authorization);
  if (!token) return null;

  return authSessionStore.getByAccessToken(token);
};

export const requireAuth = () => {
  return (context: any) => {
    const session = getAuthSession(context.headers?.authorization);
    if (!session) {
      context.set.status = 401;
      return { success: false, message: "Missing or invalid access token" };
    }
  };
};

export const requirePermission = (permission: string) => {
  return (context: any) => {
    const { headers, set } = context;
    const session = getAuthSession(headers?.authorization);
    if (!session) {
      set.status = 401;
      return { success: false, message: "Missing or invalid access token" };
    }

    const role = session.user?.role;
    const permissions = (role?.permissions ?? {}) as NestedPermissionMap;

    if (!hasPermission(permissions, permission)) {
      set.status = 403;
      return { success: false, message: "Permission denied" };
    }
  };
};

export const requireStorePermission = (...requiredPermissions: string[]) => {
  return async (context: any) => {
    const { headers, params, set } = context;
    const session = getAuthSession(headers?.authorization);
    if (!session) {
      set.status = 401;
      return { success: false, message: "Missing or invalid access token" };
    }

    const storeId = Number(params?.storeId);
    if (!Number.isInteger(storeId)) {
      set.status = 400;
      return { success: false, message: "Invalid store ID" };
    }

    const membership = await prisma.store_members.findUnique({
      where: {
        store_id_user_id: {
          store_id: storeId,
          user_id: session.user.id,
        },
      },
    });

    if (!membership) {
      set.status = 403;
      return { success: false, message: "You are not a member of this store" };
    }

    if (requiredPermissions.length > 0) {
      const permissions = (membership.permissions ?? {}) as NestedPermissionMap;
      const hasAny = requiredPermissions.some((perm) => hasPermission(permissions, perm));

      if (!hasAny) {
        set.status = 403;
        return { success: false, message: "Permission denied" };
      }
    }
  };
};

export function hasPermission(
  permissions: PermissionMap | NestedPermissionMap,
  required: string,
) {
  if (permissions["*"] === true || permissions.all === true) {
    return true;
  }

  const [module, action] = required.split(":");
  const singularModule = module.endsWith("s") ? module.slice(0, -1) : module;
  const pluralModule = module.endsWith("s") ? module : `${module}s`;

  const candidateKeys = [
    required,
    `${module}.${action}`,
    `${singularModule}:${action}`,
    `${singularModule}.${action}`,
    `${pluralModule}:${action}`,
    `${pluralModule}.${action}`,
    `${module}:*`,
    `${module}.*`,
    `${singularModule}:*`,
    `${singularModule}.*`,
    `${pluralModule}:*`,
    `${pluralModule}.*`,
  ];

  for (const key of candidateKeys) {
    if (permissions[key] === true) {
      return true;
    }
  }

  const moduleCandidates = [module, singularModule, pluralModule];
  for (const moduleKey of moduleCandidates) {
    const nested = permissions[moduleKey];
    if (nested && typeof nested === "object") {
      if (
        nested[action] === true ||
        nested["*"] === true ||
        nested.read_write === true
      ) {
        return true;
      }
    }
  }

  return false;
}
