"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext.js";

// Navigation items based on user role
const getNavItems = (role?: string) => {
  // Items visible to all authenticated users
  const baseItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Projects", href: "/projects" },
    { name: "Tasks", href: "/tasks" },
  ];

  // Items for specific roles
  const roleItems: Record<string, { name: string; href: string }[]> = {
    super_admin: [
      ...baseItems,
      { name: "Users", href: "/users" },
      { name: "Settings", href: "/settings" },
      { name: "Analytics", href: "/analytics" },
    ],
    admin: [
      ...baseItems,
      { name: "Users", href: "/users" },
      { name: "Settings", href: "/settings" },
    ],
    agent: [...baseItems, { name: "Clients", href: "/clients" }],
    user: baseItems,
  };

  // Return appropriate items based on role, default to base items
  return role && roleItems[role] ? roleItems[role] : baseItems;
};

// Main application router component
export default function AppRouter() {
  const pathname = usePathname();
  console.log("[AppRouter] MOUNT");
  const { user, loading, logout } = useAuth() as any;

  // If we're on the home page or auth pages, don't show this navigation
  if (pathname === "/" || pathname?.startsWith("/auth")) {
    return null;
  }

  // Don't render nav until we've checked auth status
  if (loading) {
    return null;
  }

  // If no user and we're not on an auth page, we shouldn't be rendering this
  if (!user) {
    return null;
  }

  const navItems = getNavItems(user.role);

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link
                href="/dashboard"
                className="text-xl font-bold text-blue-600"
              >
                SupaCRM
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      isActive
                        ? "border-blue-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center">
            <div className="hidden md:ml-4 md:flex-shrink-0 md:flex md:items-center">
              <div className="relative ml-3">
                <div className="flex items-center">
                  <div className="mr-3">
                    <p className="text-sm font-medium text-gray-700">
                      {user.full_name || user.name || user.email}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user.role || "User"}
                    </p>
                  </div>
                  <button
                    onClick={logout}
                    className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 text-sm rounded"
                  >
                    Log out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  isActive
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              >
                {item.name}
              </Link>
            );
          })}
          <div className="border-t border-gray-200 pt-4 pb-3">
            <div className="flex items-center px-4">
              <div className="flex-grow">
                <div className="text-base font-medium text-gray-800">
                  {user.full_name || user.name || user.email}
                </div>
                <div className="text-sm font-medium text-gray-500 capitalize">
                  {user.role || "User"}
                </div>
              </div>
              <button
                onClick={logout}
                className="ml-auto bg-red-500 hover:bg-red-600 text-white py-1 px-3 text-sm rounded"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
