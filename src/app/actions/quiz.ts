"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/session";
import { recalcAllLeagues } from "@/lib/results";
import { matchdayLabel } from "@/lib/matchday";

// ---- Admin ----

export async function createQuiz(formData: FormData) {
  await requireAdmin();
  const matchdayKey = formData.get("matchdayKey") as string;
  if (!matchdayKey) return { error: "Pick a matchday." };
  const existing = await prisma.quiz.findUnique({ where: { matchdayKey } });
  if (existing) return { error: "A quiz already exists for that matchday." };
  await prisma.quiz.create({
    data: { matchdayKey, title: matchdayLabel(matchdayKey) + " Quiz" },
  });
  revalidatePath("/admin/quiz");
  return { success: true };
}

export async function addQuizQuestion(formData: FormData) {
  await requireAdmin();
  const quizId = formData.get("quizId") as string;
  const text = (formData.get("text") as string)?.trim();
  const options = (formData.get("options") as string)
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);
  if (!text || options.length < 2) {
    return { error: "Add a question and at least two options (one per line)." };
  }
  const count = await prisma.quizQuestion.count({ where: { quizId } });
  await prisma.quizQuestion.create({
    data: { quizId, text, options, order: count + 1 },
  });
  revalidatePath("/admin/quiz");
  return { success: true };
}

export async function deleteQuizQuestion(formData: FormData) {
  await requireAdmin();
  const id = formData.get("questionId") as string;
  await prisma.quizQuestion.delete({ where: { id } });
  revalidatePath("/admin/quiz");
  return { success: true };
}

export async function deleteQuiz(formData: FormData) {
  await requireAdmin();
  const quizId = formData.get("quizId") as string;
  const wasGraded = (await prisma.quiz.findUnique({ where: { id: quizId } }))?.isGraded;
  await prisma.quiz.delete({ where: { id: quizId } }); // cascades questions + answers
  if (wasGraded) await recalcAllLeagues(); // its points no longer count
  revalidatePath("/admin/quiz");
  return { success: true };
}

export async function setCorrectAnswer(formData: FormData) {
  await requireAdmin();
  const questionId = formData.get("questionId") as string;
  const correctIndex = parseInt(formData.get("correctIndex") as string, 10);
  await prisma.quizQuestion.update({
    where: { id: questionId },
    data: { correctIndex: Number.isNaN(correctIndex) ? -1 : correctIndex },
  });
  revalidatePath("/admin/quiz");
  return { success: true };
}

export async function setQuizOpen(formData: FormData) {
  await requireAdmin();
  const quizId = formData.get("quizId") as string;
  const open = formData.get("open") === "true";
  await prisma.quiz.update({ where: { id: quizId }, data: { isOpen: open } });
  revalidatePath("/admin/quiz");
  return { success: true };
}

export async function gradeQuiz(formData: FormData) {
  await requireAdmin();
  const quizId = formData.get("quizId") as string;
  await prisma.quiz.update({
    where: { id: quizId },
    data: { isGraded: true, isOpen: false },
  });
  await recalcAllLeagues();

  // Notify everyone who answered this quiz.
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  const answered = await prisma.membership.findMany({
    where: { quizAnswers: { some: { question: { quizId } } } },
    select: { userId: true },
  });
  if (quiz && answered.length) {
    await prisma.notification.createMany({
      data: answered.map((m) => ({
        userId: m.userId,
        type: "BONUS_EARNED" as const,
        title: "🧠 Quiz graded",
        message: `${quiz.title} has been graded — see how you did!`,
      })),
    });
  }
  revalidatePath("/admin/quiz");
  return { success: true };
}

export async function ungradeQuiz(formData: FormData) {
  await requireAdmin();
  const quizId = formData.get("quizId") as string;
  await prisma.quiz.update({ where: { id: quizId }, data: { isGraded: false } });
  await recalcAllLeagues();
  revalidatePath("/admin/quiz");
  return { success: true };
}

// ---- Member ----

export async function submitQuizAnswer(formData: FormData) {
  const user = await requireUser();
  const leagueId = formData.get("leagueId") as string;
  const questionId = formData.get("questionId") as string;
  const choiceIndex = parseInt(formData.get("choiceIndex") as string, 10);

  const membership = await prisma.membership.findUnique({
    where: { userId_leagueId: { userId: user.id, leagueId } },
  });
  if (!membership) return { error: "You are not a member of this league." };

  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    include: { quiz: true },
  });
  if (!question) return { error: "Question not found." };
  if (!question.quiz.isOpen || question.quiz.isGraded) {
    return { error: "This quiz is closed." };
  }

  await prisma.quizAnswer.upsert({
    where: { membershipId_questionId: { membershipId: membership.id, questionId } },
    create: { membershipId: membership.id, questionId, choiceIndex },
    update: { choiceIndex },
  });
  revalidatePath(`/leagues/${leagueId}/quiz`);
  return { success: true };
}
