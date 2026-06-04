"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

/** Admin-set a user's password (no email needed). Returns nothing sensitive. */
export async function resetUserPassword(formData: FormData) {
  const admin = await requireAdmin();
  const userId = formData.get("userId") as string;
  const newPassword = (formData.get("password") as string) ?? "";
  if (newPassword.length < 6) return { error: "Password must be at least 6 characters." };
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
  void admin;
  revalidatePath("/admin/users");
  return { success: true };
}

/** Promote/demote a user between ADMIN and MEMBER. */
export async function setUserRole(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as "ADMIN" | "MEMBER";
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
  return { success: true };
}

/** Delete a user (cascades their memberships, predictions, etc.). */
export async function deleteUser(formData: FormData) {
  const admin = await requireAdmin();
  const userId = formData.get("userId") as string;
  if (userId === admin.id) return { error: "You can't delete your own admin account." };
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
  return { success: true };
}
