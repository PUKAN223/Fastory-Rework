import { Type } from "@google/genai";

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
