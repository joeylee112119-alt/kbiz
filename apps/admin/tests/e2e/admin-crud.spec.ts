import { expect, test } from "@playwright/test";

test("admin login and CRUD flow", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Role").selectOption("SUPER_ADMIN");
  await page.getByRole("button", { name: "로그인" }).click();

  await expect(page.getByRole("heading", { name: "운영 콘솔" })).toBeVisible();
  await page.getByPlaceholder("slug").fill(`pw-${Date.now()}`);
  await page.getByRole("button", { name: "LessonTemplate 생성" }).click();
  await expect(page.getByRole("status")).toContainText("LessonTemplate 생성 완료");

  await page.getByRole("button", { name: "Stage 수정" }).click();
  await expect(page.getByRole("status")).toContainText("Stage 수정 완료");

  await page.getByRole("button", { name: "MaterialCard 생성" }).click();
  await expect(page.getByRole("status")).toContainText("MaterialCard 생성 완료");

  await page.getByRole("button", { name: "Prompt version 생성·활성화" }).click();
  await expect(page.getByRole("status")).toContainText("Prompt version 활성화 완료");

  await page.getByRole("button", { name: "Backchannel clip 등록" }).click();
  await expect(page.getByRole("status")).toContainText("Backchannel clip 등록 완료");

  await page.getByRole("button", { name: "수업 세션 조회" }).click();
  await expect(page.getByRole("heading", { name: "수업 세션 조회" })).toBeVisible();
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page.getByRole("heading", { name: "Admin 로그인" })).toBeVisible();
});

test("analyst cannot modify content", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill("analyst@example.com");
  await page.getByLabel("Role").selectOption("ANALYST");
  await page.getByRole("button", { name: "로그인" }).click();
  await page.getByRole("button", { name: "LessonTemplate 생성" }).click();
  await expect(page.getByRole("status")).toContainText("권한 없음");
});
