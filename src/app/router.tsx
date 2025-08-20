"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext.js";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import useMediaQuery from "@mui/material/useMediaQuery";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import BusinessIcon from "@mui/icons-material/Business";
import FolderIcon from "@mui/icons-material/Folder";
import TaskIcon from "@mui/icons-material/Task";
import ContactsIcon from "@mui/icons-material/Contacts";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/ExitToApp";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@mui/material/styles";

const drawerWidth = 280;
// Brand colors for SupaCRM (distinct from SalesBase)
const BRAND = {
  primary: "#0ea5a4", // teal
  surface: "#071826", // deep navy
  accent: "#7dd3fc",
};

import type { ReactNode } from "react";

export default function AppRouter({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth() ?? {};
  const { user, loading, logout } = auth;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  // Don't render the router on auth-related routes, but show it on the root
  // so users can reach Settings and other pages from the default landing page.
  if (pathname?.startsWith("/auth")) return null;
  if (loading) return null;
  // If the user is not authenticated, still render the page children so the
  // public landing or auth pages are visible. AppRouter's navigation and
  // drawer should only be shown for authenticated users.
  if (!user) return <>{children}</>;

  const menuItems = [
    { text: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
    { text: "Companies", path: "/companies", icon: <PeopleIcon /> },
    { text: "Contacts", path: "/contacts", icon: <ContactsIcon /> },
    { text: "Deals", path: "/deals", icon: <BusinessIcon /> },
    { text: "Files", path: "/files", icon: <FolderIcon /> },
    { text: "Tasks", path: "/tasks", icon: <TaskIcon /> },
    { text: "Settings", path: "/settings", icon: <SettingsIcon /> },
  ];

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const drawer = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: BRAND.surface,
        color: "#fff",
      }}
    >
      <Box
        sx={{
          p: 3,
          textAlign: "center",
          borderBottom: `1px solid var(--surface-20)`,
        }}
      >
        <Typography
          variant="h6"
          sx={{ color: BRAND.primary, fontWeight: "bold" }}
        >
          SupaCRM
        </Typography>
      </Box>
      <Divider />
      <List sx={{ flexGrow: 1, px: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={Link}
              href={item.path}
              selected={pathname === item.path}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            p: 2,
            backgroundColor: "var(--surface-10)",
            borderRadius: 2,
            mb: 1,
          }}
        >
          <Avatar sx={{ width: 40, height: 40, mr: 2, bgcolor: BRAND.primary }}>
            {user?.first_name?.[0] || user?.email?.[0]}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap sx={{ color: "var(--fg)" }}>
              {String(user?.full_name || user?.name || user?.email || "")}
            </Typography>
            <Typography variant="caption" sx={{ color: "var(--muted)" }} noWrap>
              {String(user?.role || "User")}
            </Typography>
          </Box>
        </Box>
        <Button
          fullWidth
          variant="outlined"
          sx={{ borderColor: "var(--surface-20)", color: "var(--fg)" }}
          startIcon={<LogoutIcon />}
          onClick={() => {
            if (confirm("Are you sure you want to logout?")) logout();
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: "var(--brand)",
          color: "var(--fg)",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            SupaCRM
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ThemeToggle />
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              backgroundColor: BRAND.surface,
              color: "#fff",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* main content area that accounts for AppBar height and Drawer width */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          mt: { xs: "56px", md: "64px" },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
