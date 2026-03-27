import { cookies }        from "next/headers";
import { redirect }       from "next/navigation";
import { verifyAdminToken, COOKIE_NAME } from "@/lib/auth/admin";
import AdminDashboard     from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = cookies();
  const token       = cookieStore.get(COOKIE_NAME)?.value;

  if (!token || !await verifyAdminToken(token)) {
    redirect("/admin/login");
  }

  return <AdminDashboard />;
}
