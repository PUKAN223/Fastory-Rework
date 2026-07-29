export const STANDARD_ROLES = {
  Owner: {
    "*": true,
  },
  Manager: {
    "products:read": true,
    "products:write": true,
    "sales:read": true,
    "sales:write": true,
    "categories:read": true,
    "categories:write": true,
    "locations:read": true,
    "locations:write": true,
    "stocks:read": true,
    "stocks:write": true,
    "reports:read": true,
    "settings:read": false,
  },
  Cashier: {
    "sales:read": true,
    "sales:write": true,
  },
  Staff: {
    "products:read": true,
    "stocks:read": true,
    "stocks:write": true,
    "categories:read": true,
    "locations:read": true,
  },
} as const;

const ROLE_ALIASES: Record<string, StandardRole> = {
  "เจ้าของร้าน": "Owner",
  "ผู้จัดการ": "Manager",
  "แคชเชียร์": "Cashier",
  "พนักงานขาย": "Cashier",
  "พนักงานคลังสินค้า": "Staff",
};

export type StandardRole = keyof typeof STANDARD_ROLES;

export function getDefaultPermissions(jobTitle: string): Record<string, boolean> {
  // Check exact English match first
  let roleKey = Object.keys(STANDARD_ROLES).find(
    (key) => key.toLowerCase() === jobTitle.toLowerCase()
  );

  // Check aliases
  if (!roleKey && ROLE_ALIASES[jobTitle]) {
    roleKey = ROLE_ALIASES[jobTitle];
  }

  if (roleKey) {
    return STANDARD_ROLES[roleKey as StandardRole] as Record<string, boolean>;
  }
  // Default fallback if unknown role is provided, restrict to minimum (or empty)
  return {};
}
