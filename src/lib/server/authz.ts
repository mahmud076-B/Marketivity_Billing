export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export type VerifiedUser = { id: string; email: string | null; role: string; status: string };

export type Action =
  | "view_clients"
  | "create_clients"
  | "update_clients"
  | "view_invoices"
  | "create_invoices"
  | "update_invoices"
  | "duplicate_invoices"
  | "void_invoices"
  | "view_payments"
  | "create_payments"
  | "void_payments"
  | "generate_receipts"
  | "view_statements"
  | "view_analytics"
  | "export_analytics"
  | "manage_team"
  | "manage_settings"
  | "manage_catalog"
  | "export_backup"
  | "import_backup";

const STAFF_PERMISSIONS = new Set<Action>([
  "view_clients",
  "create_clients",
  "update_clients",
  "view_invoices",
  "create_invoices",
  "update_invoices",
  "duplicate_invoices",
  "view_payments",
  "create_payments",
  "generate_receipts",
  "view_statements",
  "view_analytics",
  "export_analytics",
  "manage_catalog", // Assuming staff can manage services catalog
]);

export function requirePermission(user: VerifiedUser, action: Action) {
  if (user.status !== "active") {
    throw new UnauthorizedError();
  }
  
  if (user.role === "admin") {
    return; // Admin can do everything
  }

  if (user.role === "staff") {
    if (STAFF_PERMISSIONS.has(action)) {
      return;
    }
  }

  // Not authorized
  throw new UnauthorizedError();
}
