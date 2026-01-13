// @ts-nocheck
import { useState, useMemo } from "react";
import {
  FiUsers,
  FiUser,
  FiMail,
  FiEdit,
  FiTrash2,
  FiPlus,
  FiRefreshCw,
  FiCheck,
  FiX,
  FiShield,
  FiFilter,
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";
import { useToast } from "../../hooks/useToast";
import { useAuthStore } from "../../store/authStore";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useClearAllUsers,
} from "../../hooks/queries/useUsers";
import { apiClient } from "../../services/api";
import { logger } from "../../lib/logger";
import ConfirmModal from "../../components/shared/ConfirmModal";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function AdminUsers() {
  const { showToast, ToastContainer } = useToast();
  const { user, hasAccessType } = useAuthStore();

  // UI State (component state)
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    role?: "admin" | "user" | "accountant";
    adminRole?: "admin" | "super-admin";
    isActive?: boolean;
    permissions?: string[];
  }>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    email: string;
  } | null>(null);

  // Server State (TanStack Query)
  const {
    data: rawUsers,
    isLoading: loading,
    error,
    refetch,
  } = useUsers({
    role: filterRole || undefined,
    status: filterStatus === "all" ? undefined : filterStatus,
  });
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const clearAllMutation = useClearAllUsers();

  // Ensure rawUsers is always an array and has valid id fields to prevent iteration errors
  const safeRawUsers = useMemo(() => {
    return (Array.isArray(rawUsers) ? rawUsers : []).map((u) => ({
      ...u,
      id: u.id || u._id,
    }));
  }, [rawUsers]);

  // Loading states for UI
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const submitting =
    createUserMutation.isPending ||
    updateUserMutation.isPending ||
    deleteUserMutation.isPending ||
    clearAllMutation.isPending;

  // Permission checks - only super-admin can edit/delete users
  const isSuperAdmin = user?.adminRole === "super-admin";
  const canWrite = isSuperAdmin && hasAccessType("management", "users", "write");
  const canDelete = isSuperAdmin && hasAccessType("management", "users", "write"); // Delete requires super-admin access
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user" | "accountant",
    employeeId: "",
    permissions: [] as string[], // No default permissions - explicit only
  });

  // Permission modules with all pages (aligned with AdminSidebar structure)
  const permissionModules = [
    {
      id: "general",
      label: "General",
      icon: "",
      options: [
        { id: "dashboard", label: "Dashboard", icon: "" },
        { id: "payments", label: "Payments", icon: "" },
      ],
    },
    {
      id: "management",
      label: "Management",
      icon: "",
      options: [
        { id: "organizations", label: "Organisations", icon: "" },
        { id: "employees", label: "Employees", icon: "" },
        { id: "users", label: "Users", icon: "" },
        { id: "admins", label: "Admins", icon: "" },
      ],
    },
    {
      id: "tools",
      label: "Tools",
      icon: "",
      options: [
        { id: "products", label: "Products", icon: "" },
        { id: "invoices", label: "Invoices", icon: "" },
        { id: "assets", label: "Assets", icon: "" },
      ],
    },
    {
      id: "intelligence",
      label: "Intelligence",
      icon: "",
      options: [
        { id: "ai-features", label: "AI Features", icon: "" },
        { id: "automation", label: "Automation", icon: "" },
      ],
    },
    {
      id: "system",
      label: "System",
      icon: "",
      options: [
        { id: "settings", label: "Settings", icon: "" },
        { id: "logs", label: "Logs", icon: "" },
        { id: "help", label: "Help", icon: "" },
      ],
    },
  ];

  // Flatten all available permissions for reference
  const availablePermissions = permissionModules.flatMap(
    (module) => module.options,
  );

  // Apply filtering and sorting (client-side)
  const users = useMemo(() => {
    let data = [...safeRawUsers];

    // Additional client-side filtering if needed (though TanStack Query handles role/status)
    data.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortBy) {
        case "name":
          aVal = a.name?.toLowerCase() || "";
          bVal = b.name?.toLowerCase() || "";
          break;
        case "email":
          aVal = a.email?.toLowerCase() || "";
          bVal = b.email?.toLowerCase() || "";
          break;
        case "role":
          aVal = a.role || "";
          bVal = b.role || "";
          break;
        case "status":
          aVal = a.isActive ? 1 : 0;
          bVal = b.isActive ? 1 : 0;
          break;
        case "createdAt":
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        default:
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [safeRawUsers, sortBy, sortOrder]);

  const handleEdit = (user: any) => {
    setEditingUser(user.id);
    setEditData({
      role: user.role,
      adminRole:
        user.adminRole || (user.role === "admin" ? "admin" : undefined),
      isActive: user.isActive,
      permissions:
        user.permissions && Array.isArray(user.permissions)
          ? [...user.permissions]
          : ["tools", "settings"],
    });
  };

  const handleSave = async (userId: string) => {
    try {
      const userToUpdate = safeRawUsers.find((u: any) => u.id === userId);
      if (!userToUpdate) {
        showToast("User not found", "error");
        return;
      }

      const updates: string[] = [];

      if (editData.role !== undefined && editData.role !== userToUpdate.role) {
        await apiClient.updateUserRole(userId, editData.role);
        updates.push("role");
      }

      // Update adminRole if user is an admin
      const finalRole =
        editData.role !== undefined ? editData.role : userToUpdate.role;
      if (
        finalRole === "admin" &&
        editData.adminRole !== undefined &&
        editData.adminRole !== userToUpdate.adminRole
      ) {
        await apiClient.updateUserAdminRole(userId, editData.adminRole);
        updates.push("admin role");
      }

      if (
        editData.isActive !== undefined &&
        editData.isActive !== userToUpdate.isActive
      ) {
        await apiClient.updateUserStatus(userId, editData.isActive);
        updates.push("status");
      }

      // Save permissions if the user role is 'user' (admins and accountants don't need permissions)
      if (editData.permissions !== undefined && finalRole === "user") {
        const currentPerms =
          userToUpdate.permissions && Array.isArray(userToUpdate.permissions)
            ? userToUpdate.permissions
            : ["tools", "settings"];
        const permsChanged =
          JSON.stringify([...editData.permissions].sort()) !==
          JSON.stringify([...currentPerms].sort());

        if (permsChanged) {
          await apiClient.updateUserPermissions(userId, editData.permissions);
          updates.push("permissions");
        }
      }

      if (updates.length > 0) {
        showToast(`User ${updates.join(", ")} updated successfully`, "success");
      } else {
        showToast("No changes to save", "info");
      }

      setEditingUser(null);
      setEditData({});
      refetch();
    } catch (err: any) {
      showToast(err.message || "Failed to update user", "error");
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setEditData({});
  };

  const handleAddUser = async () => {
    if (!canWrite) {
      showToast("You do not have permission to create users", "error");
      return;
    }

    try {
      if (!newUser.name || !newUser.email || !newUser.password) {
        showToast("Please fill all required fields", "warning");
        return;
      }

      // Validate password length
      if (newUser.password.length < 6) {
        showToast("Password must be at least 6 characters long", "warning");
        return;
      }

      await createUserMutation.mutateAsync(newUser);
      showToast("User created successfully", "success");
      setShowAddModal(false);
      setNewUser({
        name: "",
        email: "",
        password: "",
        role: "user",
        employeeId: "",
        permissions: [],
      });
      setFilterRole("");
      setFilterStatus("");
    } catch (err: any) {
      logger.error("Failed to create user", err);

      // Extract error message from response
      let errorMessage = "Failed to create user";
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      showToast(errorMessage, "error");
    }
  };

  const handleClearAll = async () => {
    try {
      const result = await clearAllMutation.mutateAsync();
      showToast(result.message || "Users cleared successfully", "success");
      setShowClearAllModal(false);
    } catch (err: any) {
      showToast(err.message || "Failed to clear users", "error");
    }
  };

  const handleDeleteClick = (userId: string, userEmail: string) => {
    setConfirmAction({ userId, email: userEmail });
    setShowConfirmModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmAction) return;

    if (!canDelete) {
      showToast("You do not have permission to delete users", "error");
      setShowConfirmModal(false);
      setConfirmAction(null);
      return;
    }

    try {
      await deleteUserMutation.mutateAsync(confirmAction.userId);
      showToast("User deleted successfully", "success");
      setShowConfirmModal(false);
      setConfirmAction(null);
    } catch (err: any) {
      logger.error("Delete user error:", err);
      const errorMessage =
        err?.response?.data?.message || err?.message || "Failed to delete user";
      showToast(errorMessage, "error");
      setShowConfirmModal(false);
      setConfirmAction(null);
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === "admin") {
      return <FiShield className="h-5 w-5 text-primary" />;
    }
    return <FiUser className="h-5 w-5 text-muted-foreground" />;
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === "admin") {
      return "bg-primary/10 text-primary border-primary/20";
    }
    return "bg-muted text-muted-foreground border-border";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Failed to load users";
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <FiX className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Failed to Load Users
            </h3>
            <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <FiUsers className="h-8 w-8 text-foreground" />
          <h2 className="text-2xl font-bold text-foreground">Users</h2>
          <button
            onClick={() => refetch()}
            disabled={loading}
            className={`p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${loading ? "animate-spin" : ""}`}
            title="Refresh data"
          >
            <FiRefreshCw className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setShowClearAllModal(true)}
            disabled={!canDelete || users.length === 0}
          >
            <FiTrash2 className="h-4 w-4" />
            Clear All
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            disabled={!canWrite}
            title={
              !canWrite
                ? "You do not have permission to create users"
                : "Add new user"
            }
          >
            <FiPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FiFilter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Filters:
            </span>
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
            <option value="accountant">Accountant</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="createdAt">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
            <option value="role">Sort by Role</option>
            <option value="status">Sort by Status</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="text-lg font-medium text-foreground">
            All Users ({users.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Admin Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, index) => (
                <TableRow key={user.id || user._id || index}>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                        {getRoleIcon(user.role)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">
                          {user.name}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <FiMail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {editingUser === user.id ? (
                      <select
                        value={editData.role || user.role}
                        onChange={(e) => {
                          const newRole = e.target.value as
                            | "admin"
                            | "user"
                            | "accountant";
                          // If changing to admin or accountant, clear permissions (they have predefined access)
                          if (newRole === "admin" || newRole === "accountant") {
                            setEditData({
                              ...editData,
                              role: newRole,
                              permissions: [],
                            });
                          } else {
                            // If changing to user, set default permissions if none exist
                            const currentPerms = editData.permissions ||
                              user.permissions || ["tools", "settings"];
                            setEditData({
                              ...editData,
                              role: newRole,
                              permissions: currentPerms,
                            });
                          }
                        }}
                        className="px-2 py-1 text-sm border border-border rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="accountant">Accountant</option>
                      </select>
                    ) : (
                      <Badge
                        variant={
                          user.role === "admin"
                            ? "default"
                            : user.role === "accountant"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {user.role === "admin"
                          ? "Admin"
                          : user.role === "accountant"
                            ? "Accountant"
                            : "User"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {editingUser === user.id ? (
                      // Show admin role selector only if user is or will be an admin
                      editData.role === "admin" ||
                      (editData.role === undefined && user.role === "admin") ? (
                        <select
                          value={
                            editData.adminRole || user.adminRole || "admin"
                          }
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              adminRole: e.target.value as
                                | "admin"
                                | "super-admin",
                            })
                          }
                          className="px-2 py-1 text-sm border border-border rounded focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="super-admin">Super Admin</option>
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          N/A
                        </span>
                      )
                    ) : user.role === "admin" ? (
                      <Badge
                        variant={
                          user.adminRole === "super-admin"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {user.adminRole === "super-admin"
                          ? "Super Admin"
                          : "Admin"}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {editingUser === user.id ? (
                      <select
                        value={
                          editData.isActive !== undefined
                            ? editData.isActive.toString()
                            : user.isActive.toString()
                        }
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            isActive: e.target.value === "true",
                          })
                        }
                        className="px-2 py-1 text-sm border border-border rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    ) : (
                      <Badge
                        variant={user.isActive ? "default" : "destructive"}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingUser === user.id ? (
                      // Show permissions editor only if the role is or will be 'user'
                      editData.role === "user" ||
                      (editData.role === undefined && user.role === "user") ? (
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground mb-1 font-medium">
                            Select Permissions:
                          </div>
                          <div className="space-y-3 p-3 border border-border rounded-lg bg-background max-w-md">
                            {permissionModules.map((module) => {
                              const currentPerms =
                                editData.permissions !== undefined
                                  ? editData.permissions
                                  : user.permissions &&
                                      Array.isArray(user.permissions) &&
                                      user.permissions.length > 0
                                    ? user.permissions
                                    : ["tools", "settings"];

                              const modulePermIds = module.options.map(
                                (opt) => opt.id,
                              );
                              const hasAnyModulePerm = modulePermIds.some(
                                (id) => currentPerms.includes(id),
                              );
                              const hasAllModulePerms = modulePermIds.every(
                                (id) => currentPerms.includes(id),
                              );

                              return (
                                <div
                                  key={module.id}
                                  className="border border-border rounded-lg bg-white dark:bg-gray-900"
                                >
                                  {/* Module Toggle Header */}
                                  <label className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent transition-colors rounded-t-lg">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={hasAnyModulePerm}
                                        onChange={(e) => {
                                          const basePerms =
                                            editData.permissions !== undefined
                                              ? editData.permissions
                                              : user.permissions &&
                                                  Array.isArray(
                                                    user.permissions,
                                                  )
                                                ? user.permissions
                                                : ["tools", "settings"];

                                          let newPerms;
                                          if (e.target.checked) {
                                            // Add all module permissions
                                            newPerms = [
                                              ...new Set([
                                                ...basePerms,
                                                ...modulePermIds,
                                              ]),
                                            ];
                                          } else {
                                            // Remove all module permissions
                                            newPerms = basePerms.filter(
                                              (p: string) =>
                                                !modulePermIds.includes(p),
                                            );
                                          }
                                          setEditData({
                                            ...editData,
                                            permissions: newPerms,
                                          });
                                        }}
                                        className="w-4 h-4 text-primary border-border rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm font-medium text-foreground">
                                        {module.label}
                                      </span>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {
                                        modulePermIds.filter((id) =>
                                          currentPerms.includes(id),
                                        ).length
                                      }
                                      /{modulePermIds.length}
                                    </Badge>
                                  </label>

                                  {/* Module Options (always shown) */}
                                  <div className="px-3 pb-3 pt-1 border-t border-border space-y-1.5">
                                    {module.options.map((option) => (
                                      <label
                                        key={option.id}
                                        className="flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={currentPerms.includes(
                                            option.id,
                                          )}
                                          onChange={(e) => {
                                            const basePerms =
                                              editData.permissions !== undefined
                                                ? editData.permissions
                                                : user.permissions &&
                                                    Array.isArray(
                                                      user.permissions,
                                                    )
                                                  ? user.permissions
                                                  : ["tools", "settings"];

                                            let newPerms;
                                            if (e.target.checked) {
                                              newPerms = [
                                                ...basePerms,
                                                option.id,
                                              ];
                                            } else {
                                              newPerms = basePerms.filter(
                                                (p: string) => p !== option.id,
                                              );
                                            }
                                            setEditData({
                                              ...editData,
                                              permissions: newPerms,
                                            });
                                          }}
                                          className="w-3.5 h-3.5 text-primary border-border rounded focus:ring-blue-500"
                                        />
                                        <span className="text-xs text-foreground">
                                          {option.label}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Selected:{" "}
                            {editData.permissions !== undefined
                              ? editData.permissions.length
                              : user.permissions &&
                                  Array.isArray(user.permissions)
                                ? user.permissions.length
                                : 2}{" "}
                            permission(s)
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          Full Access (Admin)
                        </span>
                      )
                    ) : user.role === "user" ? (
                      <div className="space-y-1.5">
                        {permissionModules.map((module) => {
                          const userPerms =
                            user.permissions &&
                            Array.isArray(user.permissions) &&
                            user.permissions.length > 0
                              ? user.permissions
                              : ["tools", "settings"];

                          const modulePermIds = module.options.map(
                            (opt) => opt.id,
                          );
                          const activeModulePerms = modulePermIds.filter((id) =>
                            userPerms.includes(id),
                          );

                          if (activeModulePerms.length === 0) return null;

                          return (
                            <div
                              key={module.id}
                              className="flex items-center gap-1.5"
                            >
                              <Badge variant="secondary" className="text-xs">
                                {module.label}
                              </Badge>
                              <div className="flex flex-wrap gap-1">
                                {activeModulePerms.map((permId) => {
                                  const permInfo = module.options.find(
                                    (p) => p.id === permId,
                                  );
                                  return (
                                    <Badge
                                      key={permId}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {permInfo?.icon} {permInfo?.label}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Full Access
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {user.employeeId || "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {editingUser === user.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => handleSave(user.id)}
                          variant="ghost"
                          size="icon"
                          className="text-green-600 hover:text-green-900"
                        >
                          <FiCheck className="h-5 w-5" />
                        </Button>
                        <Button
                          onClick={handleCancel}
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-900"
                        >
                          <FiX className="h-5 w-5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => handleEdit(user)}
                          variant="ghost"
                          size="icon"
                          className="text-primary hover:text-primary/80"
                          title={
                            canWrite
                              ? "Edit"
                              : "You do not have permission to edit users"
                          }
                          disabled={!canWrite}
                        >
                          <FiEdit className="h-5 w-5" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteClick(user.id, user.email)}
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-900"
                          title={
                            canDelete
                              ? "Delete"
                              : "You do not have permission to delete users"
                          }
                          disabled={!canDelete}
                        >
                          <FiTrash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {users.length === 0 && (
          <div className="text-center py-12">
            <FiUsers className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">
              No users found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {filterRole || filterStatus
                ? "Try adjusting your filters."
                : "Get started by creating a new user."}
            </p>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Dialog
        open={showAddModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            setNewUser({
              name: "",
              email: "",
              password: "",
              role: "user",
              employeeId: "",
              permissions: [],
            });
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Add New User
            </DialogTitle>
            <DialogDescription>
              Create a new user account. Fill in the required information below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Basic Information
                </h3>
                <Separator className="flex-1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    placeholder="john.doe@example.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) =>
                      setNewUser({
                        ...newUser,
                        role: value as "admin" | "user" | "accountant",
                      })
                    }
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {newUser.role === "admin"
                      ? "Admins have full system access"
                      : newUser.role === "accountant"
                        ? "Accountants have read-only access to invoices and credentials"
                        : "Users have limited access based on permissions"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID (Optional)</Label>
                <Input
                  id="employeeId"
                  type="text"
                  value={newUser.employeeId}
                  onChange={(e) =>
                    setNewUser({ ...newUser, employeeId: e.target.value })
                  }
                  placeholder="EMP-001"
                />
              </div>
            </div>

          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setNewUser({
                  name: "",
                  email: "",
                  password: "",
                  role: "user",
                  employeeId: "",
                  permissions: [],
                });
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={
                submitting ||
                !newUser.name ||
                !newUser.email ||
                !newUser.password
              }
            >
              {createUserMutation.isPending ? (
                <>
                  <FiRefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FiPlus className="mr-2 h-4 w-4" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Container */}
      <ToastContainer />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmAction(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={`Are you sure you want to delete ${confirmAction?.email}? This action cannot be undone and will permanently remove the user account${users.find((u) => u.id === confirmAction?.userId)?.role === "admin" ? " and associated admin privileges" : ""}.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Confirm Clear All Modal */}
      <ConfirmModal
        isOpen={showClearAllModal}
        onClose={() => setShowClearAllModal(false)}
        onConfirm={handleClearAll}
        title="Clear All Users"
        message="Are you sure you want to clear all non-admin users? This action will remove all regular user accounts but keep admin accounts and your own account. This cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
