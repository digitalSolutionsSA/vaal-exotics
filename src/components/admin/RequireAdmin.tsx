import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAdminAuthed } from "../../lib/adminAuth";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  if (!isAdminAuthed()) {
    return <Navigate to="/admin" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
