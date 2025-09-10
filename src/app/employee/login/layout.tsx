import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function EmployeeLoginLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const employeeId = cookieStore.get("employee_auth")?.value;
  if (employeeId) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (employee?.isSuperAdmin) {
      redirect("/dashboard");
    } else {
      redirect("/employee");
    }
  }
  return <>{children}</>;
}

