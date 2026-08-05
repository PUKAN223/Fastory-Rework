import { Type } from "@google/genai";
import { prisma } from "../../db/client";

// Set of tool names that require user confirmation before execution
export const ACTION_REQUIRED_TOOLS = new Set([
  "updateStoreSettings",
  "updateMemberRole",
  "removeStoreMember",
  "addStoreMember",
  "createProduct",
  "updateProduct",
  "bulkUpdateProducts",
  "deleteProduct",
  "createCategory",
  "deleteCategory",
  "createLocation",
  "updateLocation",
  "deleteLocation",
  "adjustStock",
  "voidOrder",
]);

// Define all tool schemas for Gemini
export const geminiTools: any[] = [
  {
    functionDeclarations: [
      // --- STORE & SETTINGS ---
      {
        name: "getStoreDetails",
        description: "Get detailed settings of the store including receipt headers, footers, tax ID, and PromptPay ID.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
          },
          required: ["storeId"],
        },
      },
      {
        name: "updateStoreSettings",
        description: "Update store receipt header, footer, tax ID, or PromptPay ID. REQUIRES USER CONFIRMATION.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            receiptHeader: { type: Type.STRING, description: "Header text for receipt" },
            receiptFooter: { type: Type.STRING, description: "Footer text for receipt" },
            receiptTaxId: { type: Type.STRING, description: "Tax Registration ID" },
            promptpayId: { type: Type.STRING, description: "PromptPay Phone/Tax ID" },
          },
          required: ["storeId"],
        },
      },

      // --- TEAM & MEMBERS ---
      {
        name: "getStoreMembers",
        description: "Get a list of all team members/staff working in the store.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
          },
          required: ["storeId"],
        },
      },
      {
        name: "updateMemberRole",
        description: "Update the job title of a store member. REQUIRES USER CONFIRMATION.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            memberId: { type: Type.NUMBER, description: "Member ID" },
            jobTitle: { type: Type.STRING, description: "New job title" },
          },
          required: ["storeId", "memberId", "jobTitle"],
        },
      },
      {
        name: "removeStoreMember",
        description: "Remove a member from the store team. REQUIRES USER CONFIRMATION.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            memberId: { type: Type.NUMBER, description: "Member ID to remove" },
          },
          required: ["storeId", "memberId"],
        },
      },
      {
        name: "addStoreMember",
        description: "Add or invite a new staff member to the store team by email or username with a job title (e.g. พนักงานขาย, พนักงานคลัง). REQUIRES USER CONFIRMATION.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            emailOrUsername: { type: Type.STRING, description: "User email or username to add" },
            jobTitle: { type: Type.STRING, description: "Job title / position (e.g. พนักงานขายหน้าร้าน, ผู้จัดการร้าน)" },
          },
          required: ["storeId", "emailOrUsername"],
        },
      },

      // --- PRODUCTS & CATEGORIES ---
      {
        name: "searchProducts",
        description: "Search for products in store inventory by name, SKU (รหัสสินค้า), or keyword to get product ID, name, SKU, price, stock, and category.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            query: { type: Type.STRING, description: "Product name or SKU search query" },
          },
          required: ["storeId", "query"],
        },
      },
      {
        name: "searchProductByName",
        description: "Search for a product by name, partial name, or SKU to get SKU, stock, and price.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            query: { type: Type.STRING, description: "Product name or SKU search query" },
          },
          required: ["storeId", "query"],
        },
      },
      {
        name: "searchProductBySku",
        description: "Search for a product specifically by SKU code (รหัสสินค้า) to get product ID, name, stock, and price.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            sku: { type: Type.STRING, description: "Product SKU code" },
          },
          required: ["storeId", "sku"],
        },
      },
      {
        name: "getLowStockProducts",
        description: "Get a list of products with low stock (stock <= 10 or <= reorder point).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            limit: { type: Type.NUMBER, description: "Max results count" },
          },
          required: ["storeId"],
        },
      },
      {
        name: "createProduct",
        description: "Create a new product item (เพิ่มสินค้าใหม่) in the store inventory. REQUIRES USER CONFIRMATION.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            name: { type: Type.STRING, description: "Product item name" },
            sku: { type: Type.STRING, description: "Product SKU (optional, auto-generated if missing)" },
            categoryId: { type: Type.NUMBER, description: "Category ID (optional)" },
            sellingPrice: { type: Type.NUMBER, description: "Selling price in THB (optional, default 0)" },
            costPrice: { type: Type.NUMBER, description: "Cost price in THB (optional, default 0)" },
            stockOnHand: { type: Type.NUMBER, description: "Initial stock count (optional, default 0)" },
          },
          required: ["storeId", "name"],
        },
      },
      {
        name: "updateProduct",
        description: "Update single product price, cost, name, category, or reorder point. Can move product to a new or existing category. REQUIRES USER CONFIRMATION.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            productId: { type: Type.NUMBER, description: "Product ID" },
            name: { type: Type.STRING, description: "New product name" },
            categoryId: { type: Type.NUMBER, description: "New Category ID (optional)" },
            categoryName: { type: Type.STRING, description: "New Category name (optional, e.g. 'ขนม', 'เครื่องดื่ม')" },
            sellingPrice: { type: Type.NUMBER, description: "New selling price" },
            costPrice: { type: Type.NUMBER, description: "New cost price" },
            reorderPoint: { type: Type.NUMBER, description: "New reorder point" },
          },
          required: ["storeId", "productId"],
        },
      },
      {
        name: "bulkUpdateProducts",
        description: "Update multiple products at once (e.g. bulk rename to Thai, move category, update prices, costs, or reorder points for 2 or more products). REQUIRES USER CONFIRMATION.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            updates: {
              type: Type.ARRAY,
              description: "List of product updates",
              items: {
                type: Type.OBJECT,
                properties: {
                  productId: { type: Type.NUMBER, description: "Product ID to update" },
                  name: { type: Type.STRING, description: "New product name (optional)" },
                  categoryId: { type: Type.NUMBER, description: "New Category ID (optional)" },
                  categoryName: { type: Type.STRING, description: "New Category name (optional, e.g. 'ขนม', 'เครื่องดื่ม')" },
                  sellingPrice: { type: Type.NUMBER, description: "New selling price (optional)" },
                  costPrice: { type: Type.NUMBER, description: "New cost price (optional)" },
                  reorderPoint: { type: Type.NUMBER, description: "New reorder point (optional)" },
                },
                required: ["productId"],
              },
            },
          },
          required: ["storeId", "updates"],
        },
      },
      {
        name: "deleteProduct",
        description: "Delete or deactivate a product from the store. REQUIRES USER CONFIRMATION.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            productId: { type: Type.NUMBER, description: "Product ID to delete" },
          },
          required: ["storeId", "productId"],
        },
      },
      {
        name: "createCategory",
        description: "Create a new product category (เพิ่มหมวดหมู่สินค้าใหม่/กลุ่มสินค้า) for grouping items. REQUIRES USER CONFIRMATION.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            name: { type: Type.STRING, description: "Category name (e.g. เครื่องดื่ม, ขนม, อาหาร)" },
          },
          required: ["storeId", "name"],
        },
      },
      {
        name: "deleteCategory",
        description: "Delete a product category. REQUIRES USER CONFIRMATION.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            categoryId: { type: Type.NUMBER, description: "Category ID to delete" },
          },
          required: ["storeId", "categoryId"],
        },
      },

      // --- WAREHOUSES / LOCATIONS ---
      {
        name: "getStoreLocations",
        description: "List all warehouses and storage locations in the store with max capacity.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
          },
          required: ["storeId"],
        },
      },
      {
        name: "createLocation",
        description: "Create a new warehouse/storage location. REQUIRES USER CONFIRMATION.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            name: { type: Type.STRING, description: "Location/Warehouse name" },
            description: { type: Type.STRING, description: "Description" },
            maxCapacity: { type: Type.NUMBER, description: "Max capacity count" },
          },
          required: ["storeId", "name"],
        },
      },
      {
        name: "updateLocation",
        description: "Update a warehouse/location name or max capacity. REQUIRES USER CONFIRMATION.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            locationId: { type: Type.NUMBER, description: "Location ID" },
            name: { type: Type.STRING, description: "New location name" },
            maxCapacity: { type: Type.NUMBER, description: "New max capacity" },
          },
          required: ["storeId", "locationId"],
        },
      },
      {
        name: "deleteLocation",
        description: "Delete a warehouse/storage location. REQUIRES USER CONFIRMATION.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            locationId: { type: Type.NUMBER, description: "Location ID to delete" },
          },
          required: ["storeId", "locationId"],
        },
      },

      // --- STOCK MOVEMENTS & ADJUSTMENTS ---
      {
        name: "adjustStock",
        description: "Adjust stock count for a product (add/subtract) and log stock movement reason. REQUIRES USER CONFIRMATION.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            productId: { type: Type.NUMBER, description: "Product ID" },
            delta: { type: Type.NUMBER, description: "Quantity change (+positive or -negative)" },
            reason: { type: Type.STRING, description: "Reason (e.g., Restock, Damaged, Correction)" },
            note: { type: Type.STRING, description: "Optional notes" },
          },
          required: ["storeId", "productId", "delta", "reason"],
        },
      },
      {
        name: "getStockMovementHistory",
        description: "Get recent stock movement history (audit trail) for a store or specific product.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            productId: { type: Type.NUMBER, description: "Optional Product ID filter" },
            limit: { type: Type.NUMBER, description: "Max results count" },
          },
          required: ["storeId"],
        },
      },

      // --- SALES & ORDERS ---
      {
        name: "getTodaySales",
        description: "Get total sales revenue and order count for the current day.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
          },
          required: ["storeId"],
        },
      },
      {
        name: "getSalesReportByDate",
        description: "Get daily sales breakdown (revenue and order counts) for the last N days (e.g. 7 or 30 days) to generate sales charts or tables.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            days: { type: Type.NUMBER, description: "Number of days back (default 7)" },
          },
          required: ["storeId"],
        },
      },
      {
        name: "getAllProducts",
        description: "Get full list of active products with price, cost, stock on hand, SKU, and category name to create product inventory tables.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            limit: { type: Type.NUMBER, description: "Max products limit (default 50)" },
          },
          required: ["storeId"],
        },
      },
      {
        name: "getCategorySummary",
        description: "Get category breakdown showing product count and stock levels per category.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
          },
          required: ["storeId"],
        },
      },
      {
        name: "getRecentOrders",
        description: "Get a list of recent orders with order numbers, totals, and payment methods.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            limit: { type: Type.NUMBER, description: "Max orders to fetch" },
          },
          required: ["storeId"],
        },
      },
      {
        name: "voidOrder",
        description: "Void a completed order/receipt and restore product stock. REQUIRES USER CONFIRMATION.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            storeId: { type: Type.NUMBER, description: "Store ID" },
            orderId: { type: Type.NUMBER, description: "Order ID to void" },
            reason: { type: Type.STRING, description: "Reason for voiding" },
          },
          required: ["storeId", "orderId"],
        },
      },
    ],
  },
];

function checkToolPermission(name: string, userPermissions: Record<string, boolean>): boolean {
  if (userPermissions["*"] || userPermissions.all) return true;

  const toolPermissionMap: Record<string, string[]> = {
    updateStoreSettings: ["settings:write"],
    getStoreMembers: ["settings:read"],
    updateMemberRole: ["settings:write"],
    removeStoreMember: ["settings:write"],
    addStoreMember: ["settings:write"],
    createProduct: ["products:write"],
    updateProduct: ["products:write"],
    bulkUpdateProducts: ["products:write"],
    deleteProduct: ["products:write"],
    createCategory: ["categories:write"],
    deleteCategory: ["categories:write"],
    createLocation: ["locations:write"],
    updateLocation: ["locations:write"],
    deleteLocation: ["locations:write"],
    adjustStock: ["stocks:write"],
    getTodaySales: ["reports:read"],
    getSalesReportByDate: ["reports:read"],
    getCategorySalesBreakdown: ["reports:read"],
    voidOrder: ["sales:write"],
  };

  const required = toolPermissionMap[name];
  if (!required) return true;

  return required.some((perm) => userPermissions[perm] === true);
}

// Execute requested tool safely in Prisma with permission enforcement
export async function executeTool(
  name: string,
  args: any,
  userPermissions: Record<string, boolean> = {},
  roleName = "ผู้ใช้"
): Promise<any> {
  const storeId = Number(args.storeId);
  if (isNaN(storeId)) {
    return { error: "Invalid storeId" };
  }

  if (!checkToolPermission(name, userPermissions)) {
    return {
      error: `ขออภัยครับ บัญชีของคุณ (${roleName}) ไม่มีสิทธิ์ใช้งานฟังก์ชัน ${name} (Permission Denied)`,
    };
  }

  try {
    switch (name) {
      // --- STORE ---
      case "getStoreDetails": {
        const store = await prisma.stores.findUnique({
          where: { id: storeId },
          select: { id: true, name: true, description: true, receipt_header: true, receipt_footer: true, receipt_tax_id: true, promptpay_id: true },
        });
        return store || { error: "Store not found" };
      }

      case "updateStoreSettings": {
        const updated = await prisma.stores.update({
          where: { id: storeId },
          data: {
            ...(args.receiptHeader !== undefined && { receipt_header: args.receiptHeader }),
            ...(args.receiptFooter !== undefined && { receipt_footer: args.receiptFooter }),
            ...(args.receiptTaxId !== undefined && { receipt_tax_id: args.receiptTaxId }),
            ...(args.promptpayId !== undefined && { promptpay_id: args.promptpayId }),
          },
        });
        return { success: true, message: "อัปเดตการตั้งค่าร้านค้าเรียบร้อยแล้ว", store: updated };
      }

      // --- MEMBERS ---
      case "getStoreMembers": {
        const members = await prisma.store_members.findMany({
          where: { store_id: storeId },
          include: {
            user: {
              select: { username: true, email: true, roles: { select: { name: true } } },
            },
          },
        });
        return {
          members: members.map((m) => ({
            id: m.id,
            userId: m.user_id,
            username: m.user.username,
            email: m.user.email,
            jobTitle: m.job_title || m.user.roles.name,
          })),
          count: members.length,
        };
      }

      case "updateMemberRole": {
        const updated = await prisma.store_members.update({
          where: { id: Number(args.memberId) },
          data: { job_title: args.jobTitle },
        });
        return { success: true, message: "อัปเดตตำแหน่งพนักงานเรียบร้อยแล้ว", member: updated };
      }

      case "removeStoreMember": {
        await prisma.store_members.delete({
          where: { id: Number(args.memberId) },
        });
        return { success: true, message: "ลบพนักงานออกจากร้านค้าเรียบร้อยแล้ว" };
      }

      case "addStoreMember": {
        const emailOrUsername = String(args.emailOrUsername || "").trim();
        const jobTitle = String(args.jobTitle || "พนักงานขาย").trim();

        const user = await prisma.users.findFirst({
          where: {
            OR: [
              { email: { equals: emailOrUsername, mode: "insensitive" } },
              { username: { equals: emailOrUsername, mode: "insensitive" } },
            ],
          },
        });

        if (!user) {
          return { error: `ไม่พบผู้ใช้งานที่มีอีเมล/ชื่อผู้ใช้ "${emailOrUsername}" ในระบบ กรุณาตรวจสอบและแจ้งผู้ใช้สมัครสมาชิกก่อน` };
        }

        const existingMember = await prisma.store_members.findFirst({
          where: { store_id: storeId, user_id: user.id },
        });

        if (existingMember) {
          return { error: `ผู้ใช้ ${user.username} (${user.email}) เป็นพนักงานในร้านค้านี้อยู่แล้ว` };
        }

        const member = await prisma.store_members.create({
          data: {
            store_id: storeId,
            user_id: user.id,
            job_title: jobTitle,
            permissions: {},
          },
          include: {
            user: {
              select: { username: true, email: true },
            },
          },
        });

        return {
          success: true,
          message: `เพิ่มคุณ ${user.username} (${user.email}) เข้าร่วมทีมร้านค้าในตำแหน่ง "${jobTitle}" เรียบร้อยแล้ว`,
          member: {
            id: member.id,
            username: user.username,
            email: user.email,
            jobTitle,
          },
        };
      }

      // --- PRODUCTS & CATEGORIES ---
      case "searchProducts":
      case "searchProductByName":
      case "searchProductBySku": {
        const query = String(args.query || args.sku || "").trim();
        const products = await prisma.products.findMany({
          where: {
            store_id: storeId,
            is_active: true,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { sku: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 10,
          select: {
            id: true,
            name: true,
            selling_price: true,
            cost_price: true,
            stock_on_hand: true,
            sku: true,
            categories: { select: { name: true } },
          },
        });
        return {
          products: products.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: Number(p.selling_price),
            cost: Number(p.cost_price),
            stock: p.stock_on_hand,
            category: p.categories?.name || "ไม่ระบุ",
          })),
          count: products.length,
        };
      }

      case "getLowStockProducts": {
        const limit = args.limit ? Number(args.limit) : 5;
        const lowStockProducts = await prisma.products.findMany({
          where: {
            store_id: storeId,
            is_active: true,
            stock_on_hand: { lte: 10 },
          },
          take: limit,
          select: { id: true, name: true, selling_price: true, stock_on_hand: true, sku: true, reorder_point: true },
        });
        return {
          lowStockProducts: lowStockProducts.map((p) => ({
            id: p.id,
            name: p.name.replace(/"/g, "'"),
            price: Number(p.selling_price),
            stock: p.stock_on_hand,
            sku: p.sku,
            reorderPoint: p.reorder_point,
          })),
          count: lowStockProducts.length,
        };
      }

      case "createProduct": {
        let categoryId = args.categoryId ? Number(args.categoryId) : undefined;
        if (!categoryId) {
          const firstCat = await prisma.categories.findFirst({
            where: { store_id: storeId },
            select: { id: true },
          });
          if (firstCat) {
            categoryId = firstCat.id;
          } else {
            const newCat = await prisma.categories.create({
              data: { store_id: storeId, name: "ทั่วไป" },
            });
            categoryId = newCat.id;
          }
        }

        const sku = args.sku || `SKU-${Date.now().toString().slice(-6)}`;
        const sellingPrice = args.sellingPrice ? Number(args.sellingPrice) : 0;
        const costPrice = args.costPrice ? Number(args.costPrice) : 0;
        const stockOnHand = args.stockOnHand ? Number(args.stockOnHand) : 0;

        const newProduct = await prisma.products.create({
          data: {
            store_id: storeId,
            name: args.name,
            sku,
            category_id: categoryId,
            selling_price: sellingPrice,
            cost_price: costPrice,
            stock_on_hand: stockOnHand,
          },
        });
        return { success: true, message: `เพิ่มสินค้าใหม่ "${newProduct.name}" (SKU: ${newProduct.sku}) เรียบร้อยแล้ว`, product: newProduct };
      }

      case "updateProduct": {
        let categoryId = args.categoryId ? Number(args.categoryId) : undefined;
        if (!categoryId && args.categoryName) {
          const catName = String(args.categoryName).trim();
          const foundCat = await prisma.categories.findFirst({
            where: {
              store_id: storeId,
              name: { equals: catName, mode: "insensitive" },
            },
            select: { id: true },
          });
          if (foundCat) {
            categoryId = foundCat.id;
          } else {
            const newCat = await prisma.categories.create({
              data: { store_id: storeId, name: catName },
              select: { id: true },
            });
            categoryId = newCat.id;
          }
        }

        const updated = await prisma.products.update({
          where: { id: Number(args.productId) },
          data: {
            ...(args.name && { name: args.name }),
            ...(args.sellingPrice !== undefined && { selling_price: args.sellingPrice }),
            ...(args.costPrice !== undefined && { cost_price: args.costPrice }),
            ...(args.reorderPoint !== undefined && { reorder_point: Number(args.reorderPoint) }),
            ...(categoryId !== undefined && { category_id: categoryId }),
          },
          include: { categories: { select: { name: true } } },
        });
        return {
          success: true,
          message: `อัปเดตข้อมูลสินค้า "${updated.name}" ${updated.categories?.name ? `(หมวดหมู่: ${updated.categories.name})` : ""} เรียบร้อยแล้ว`,
          product: updated,
        };
      }

      case "bulkUpdateProducts": {
        const updates = Array.isArray(args.updates) ? args.updates : [];
        if (updates.length === 0) {
          return { error: "ไม่มีรายการสินค้าที่ต้องการอัปเดต" };
        }

        const categoryCache = new Map<string, number>();

        const resolvedUpdates = await Promise.all(
          updates.map(async (item: any) => {
            let categoryId = item.categoryId ? Number(item.categoryId) : undefined;
            if (!categoryId && item.categoryName) {
              const catName = String(item.categoryName).trim();
              if (categoryCache.has(catName.toLowerCase())) {
                categoryId = categoryCache.get(catName.toLowerCase())!;
              } else {
                let foundCat = await prisma.categories.findFirst({
                  where: {
                    store_id: storeId,
                    name: { equals: catName, mode: "insensitive" },
                  },
                  select: { id: true },
                });
                if (!foundCat) {
                  foundCat = await prisma.categories.create({
                    data: { store_id: storeId, name: catName },
                    select: { id: true },
                  });
                }
                categoryId = foundCat.id;
                categoryCache.set(catName.toLowerCase(), categoryId);
              }
            }

            return {
              productId: Number(item.productId),
              data: {
                ...(item.name && { name: item.name }),
                ...(item.sellingPrice !== undefined && { selling_price: Number(item.sellingPrice) }),
                ...(item.costPrice !== undefined && { cost_price: Number(item.costPrice) }),
                ...(item.reorderPoint !== undefined && { reorder_point: Number(item.reorderPoint) }),
                ...(categoryId !== undefined && { category_id: categoryId }),
              },
            };
          })
        );

        const updatePromises = resolvedUpdates.map(({ productId, data }) =>
          prisma.products.update({
            where: { id: productId },
            data,
            include: { categories: { select: { name: true } } },
          })
        );

        const updatedProducts = await prisma.$transaction(updatePromises);

        return {
          success: true,
          message: `อัปเดตและเปลี่ยนหมวดหมู่สินค้าสำเร็จจำนวน ${updatedProducts.length} รายการเรียบร้อยแล้ว`,
          updatedCount: updatedProducts.length,
          products: updatedProducts.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.selling_price,
            category: p.categories?.name,
          })),
        };
      }

      case "deleteProduct": {
        await prisma.products.update({
          where: { id: Number(args.productId) },
          data: { is_active: false },
        });
        return { success: true, message: "ลบสินค้าออกจากระบบเรียบร้อยแล้ว" };
      }

      case "createCategory": {
        const category = await prisma.categories.create({
          data: { store_id: storeId, name: args.name },
        });
        return { success: true, message: "สร้างหมวดหมู่ใหม่เรียบร้อยแล้ว", category };
      }

      case "deleteCategory": {
        await prisma.categories.delete({
          where: { id: Number(args.categoryId) },
        });
        return { success: true, message: "ลบหมวดหมู่เรียบร้อยแล้ว" };
      }

      // --- WAREHOUSES / LOCATIONS ---
      case "getStoreLocations": {
        const locations = await prisma.locations.findMany({
          where: { store_id: storeId },
        });
        return { locations, count: locations.length };
      }

      case "createLocation": {
        const location = await prisma.locations.create({
          data: {
            store_id: storeId,
            name: args.name,
            description: args.description || null,
            max_capacity: args.maxCapacity || 0,
          },
        });
        return { success: true, message: "สร้างคลังสินค้าใหม่เรียบร้อยแล้ว", location };
      }

      case "updateLocation": {
        const updated = await prisma.locations.update({
          where: { id: Number(args.locationId) },
          data: {
            ...(args.name && { name: args.name }),
            ...(args.maxCapacity !== undefined && { max_capacity: Number(args.maxCapacity) }),
          },
        });
        return { success: true, message: "อัปเดตข้อมูลคลังสินค้าเรียบร้อยแล้ว", location: updated };
      }

      case "deleteLocation": {
        await prisma.locations.delete({
          where: { id: Number(args.locationId) },
        });
        return { success: true, message: "ลบคลังสินค้าเรียบร้อยแล้ว" };
      }

      // --- STOCK MOVEMENTS & ADJUSTMENTS ---
      case "adjustStock": {
        const productId = Number(args.productId);
        const delta = Number(args.delta);

        // Update product stock and log movement transaction
        const [updatedProduct] = await prisma.$transaction([
          prisma.products.update({
            where: { id: productId },
            data: { stock_on_hand: { increment: delta }, stock_updated_at: new Date() },
          }),
          prisma.product_stock_movements.create({
            data: {
              store_id: storeId,
              product_id: productId,
              delta: delta,
              reason: args.reason || "ปรับเปลี่ยนผ่าน AI Assistant",
              note: args.note || null,
            },
          }),
        ]);

        return {
          success: true,
          message: `ปรับสต็อกเรียบร้อยแล้ว (สต็อกใหม่: ${updatedProduct.stock_on_hand} ชิ้น)`,
          product: updatedProduct,
        };
      }

      case "getStockMovementHistory": {
        const limit = args.limit ? Number(args.limit) : 10;
        const movements = await prisma.product_stock_movements.findMany({
          where: {
            store_id: storeId,
            ...(args.productId && { product_id: Number(args.productId) }),
          },
          orderBy: { created_at: "desc" },
          take: limit,
          include: { products: { select: { name: true, sku: true } } },
        });
        return {
          movements: movements.map((m) => ({
            id: m.id.toString(),
            productId: m.product_id,
            productName: m.products.name,
            sku: m.products.sku,
            delta: m.delta,
            reason: m.reason,
            note: m.note,
            createdAt: m.created_at,
          })),
          count: movements.length,
        };
      }

      // --- SALES & ORDERS ---
      case "getTodaySales": {
        const todayOrders = await prisma.orders.findMany({
          where: {
            store_id: storeId,
            status: "completed",
            created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
          select: { total: true },
        });
        const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total), 0);
        return { revenue: todayRevenue, orderCount: todayOrders.length };
      }

      case "getSalesReportByDate": {
        const days = args.days ? Number(args.days) : 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days + 1);
        startDate.setHours(0, 0, 0, 0);

        const orders = await prisma.orders.findMany({
          where: {
            store_id: storeId,
            status: "completed",
            created_at: { gte: startDate },
          },
          select: { total: true, created_at: true },
        });

        const salesMap: Record<string, { revenue: number; ordersCount: number }> = {};
        for (let i = 0; i < days; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          const dateStr = d.toISOString().split("T")[0];
          salesMap[dateStr] = { revenue: 0, ordersCount: 0 };
        }

        for (const o of orders) {
          const dateStr = o.created_at.toISOString().split("T")[0];
          if (salesMap[dateStr]) {
            salesMap[dateStr].revenue += Number(o.total);
            salesMap[dateStr].ordersCount += 1;
          }
        }

        const salesReport = Object.entries(salesMap).map(([date, data]) => ({
          date,
          revenue: data.revenue,
          ordersCount: data.ordersCount,
        }));

        return { salesReport, totalDays: days };
      }

      case "getAllProducts": {
        const limit = args.limit ? Number(args.limit) : 50;
        const products = await prisma.products.findMany({
          where: { store_id: storeId, is_active: true },
          take: limit,
          include: { categories: { select: { name: true } } },
          orderBy: { name: "asc" },
        });

        return {
          products: products.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            category: p.categories?.name || "ไม่มีหมวดหมู่",
            sellingPrice: Number(p.selling_price),
            costPrice: Number(p.cost_price),
            stock: p.stock_on_hand,
          })),
          count: products.length,
        };
      }

      case "getCategorySummary": {
        const categories = await prisma.categories.findMany({
          where: { store_id: storeId },
          include: {
            products: {
              where: { is_active: true },
              select: { stock_on_hand: true, selling_price: true },
            },
          },
        });

        const summary = categories.map((cat) => {
          const productCount = cat.products.length;
          const totalStock = cat.products.reduce((acc, p) => acc + p.stock_on_hand, 0);
          const totalStockValue = cat.products.reduce(
            (acc, p) => acc + p.stock_on_hand * Number(p.selling_price),
            0
          );
          return {
            categoryId: cat.id,
            categoryName: cat.name,
            productCount,
            totalStock,
            totalStockValue,
          };
        });

        return { categories: summary, count: summary.length };
      }

      case "getRecentOrders": {
        const limit = args.limit ? Number(args.limit) : 5;
        const recentOrders = await prisma.orders.findMany({
          where: { store_id: storeId, status: "completed" },
          orderBy: { created_at: "desc" },
          take: limit,
          select: { id: true, order_number: true, total: true, payment_method: true, created_at: true },
        });
        return { recentOrders, count: recentOrders.length };
      }

      case "voidOrder": {
        const orderId = Number(args.orderId);
        const order = await prisma.orders.findUnique({
          where: { id: orderId },
          include: { items: true },
        });

        if (!order || order.status === "voided") {
          return { error: "คำสั่งซื้อไม่ถูกต้องหรือถูกยกเลิกไปแล้ว" };
        }

        // Void order and restore stock in transaction
        await prisma.$transaction([
          prisma.orders.update({
            where: { id: orderId },
            data: { status: "voided", voided_at: new Date() },
          }),
          ...order.items.map((item) =>
            prisma.products.update({
              where: { id: item.product_id },
              data: { stock_on_hand: { increment: item.quantity } },
            })
          ),
          ...order.items.map((item) =>
            prisma.product_stock_movements.create({
              data: {
                store_id: storeId,
                product_id: item.product_id,
                delta: item.quantity,
                reason: `ยกเลิกคำสั่งซื้อ #${order.order_number}`,
                note: args.reason || "Voided via AI Assistant",
              },
            })
          ),
        ]);

        return { success: true, message: `ยกเลิกคำสั่งซื้อ #${order.order_number} และคืนสต็อกเรียบร้อยแล้ว` };
      }

      default:
        return { error: `Tool ${name} not found` };
    }
  } catch (err: any) {
    console.error(`Error executing tool ${name}:`, err);
    return { error: err.message || "Failed to execute tool operation" };
  }
}
