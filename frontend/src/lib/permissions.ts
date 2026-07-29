export function hasStorePermission(
  permissions: Record<string, boolean> | undefined,
  requiredPermission?: string,
): boolean {
  if (!requiredPermission) return true;
  if (!permissions) return false;

  // Wildcard permissions (Owner / Admin)
  if (permissions["*"] === true || permissions.all === true) {
    return true;
  }

  // Direct match e.g. "products:read"
  if (permissions[requiredPermission] === true) {
    return true;
  }

  // Module wildcard e.g. "products:*" or "products.*" or "products"
  const [module] = requiredPermission.split(":");
  if (
    permissions[`${module}:*`] === true ||
    permissions[`${module}.*`] === true ||
    permissions[module] === true
  ) {
    return true;
  }

  return false;
}
