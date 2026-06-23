import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const lessonSeeds = [
  { slug: "restaurant-ordering-a1", titleKo: "식당에서 주문하기", titleEn: "Ordering at a restaurant", level: "A1", category: "travel" },
  { slug: "hotel-checkin-a1", titleKo: "호텔 체크인", titleEn: "Hotel check-in", level: "A1", category: "travel" },
  { slug: "airport-directions-a2", titleKo: "공항에서 길 묻기", titleEn: "Asking directions at the airport", level: "A2", category: "travel" },
  { slug: "work-intro-a2", titleKo: "직장 자기소개", titleEn: "Introducing yourself at work", level: "A2", category: "work" },
  { slug: "weekend-plans-a1", titleKo: "주말 계획 이야기하기", titleEn: "Talking about weekend plans", level: "A1", category: "daily" },
  { slug: "cafe-order-a1", titleKo: "카페에서 주문하기", titleEn: "Ordering at a cafe", level: "A1", category: "daily" },
  { slug: "phone-reservation-a2", titleKo: "전화로 예약하기", titleEn: "Making a reservation by phone", level: "A2", category: "daily" },
  { slug: "expressing-opinions-b1", titleKo: "의견 표현하기", titleEn: "Expressing opinions", level: "B1", category: "discussion" },
  { slug: "past-experience-a2", titleKo: "과거 경험 말하기", titleEn: "Talking about past experiences", level: "A2", category: "daily" },
  { slug: "hobbies-a1", titleKo: "취미 이야기하기", titleEn: "Talking about hobbies", level: "A1", category: "daily" }
] as const;

const stageTemplates = [
  ["CHECK_IN", 1, 40, "오늘 컨디션 확인", false],
  ["WARM_UP", 2, 110, "짧은 질문으로 말문 열기", true],
  ["TARGET_PHRASES", 3, 150, "핵심 표현 연습", false],
  ["GUIDED_ROLEPLAY", 4, 330, "안내된 역할극", true],
  ["FREE_TALK", 5, 150, "상황 확장 대화", true],
  ["CORRECTION", 6, 90, "중요 오류 교정", false],
  ["WRAP_UP", 7, 30, "수업 마무리", false]
] as const;

async function main(): Promise<void> {
  const tutor = await prisma.tutor.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Emma",
      personaKo: "차분하고 명확하게 말해주는 미국식 영어 튜터",
      personaEn: "A calm American English tutor who gives concise, encouraging guidance.",
      imageUrl: "/assets/tutors/emma.png",
      voices: {
        create: {
          provider: "openai",
          providerKey: "marin",
          displayName: "Marin",
          isDefault: true
        }
      }
    }
  });

  for (const clipKey of ["mm_hm_01", "mm_hm_02", "uh_huh_01", "uh_huh_02", "i_see_01", "right_01", "okay_01"]) {
    await prisma.backchannelClip.upsert({
      where: { tutorId_clipKey: { tutorId: tutor.id, clipKey } },
      update: {},
      create: {
        tutorId: tutor.id,
        clipKey,
        label: clipKey.replaceAll("_", " "),
        audioUrl: `/assets/backchannel/${clipKey}.mp3`,
        durationMs: 420
      }
    });
  }

  const promptTemplate = await prisma.promptTemplate.upsert({
    where: { name: "default-tutor" },
    update: {},
    create: {
      name: "default-tutor",
      description: "Default English tutor prompt template."
    }
  });

  const promptVersion = await prisma.promptVersion.upsert({
    where: { promptTemplateId_version: { promptTemplateId: promptTemplate.id, version: 1 } },
    update: { isActive: true },
    create: {
      promptTemplateId: promptTemplate.id,
      version: 1,
      isActive: true,
      body: [
        "You are an English conversation tutor for adult Korean learners.",
        "Speak in 1-2 short sentences and ask one question at a time.",
        "Prioritize the current lesson objective, target expressions, and remaining time.",
        "Use brief Korean hints only when a beginner asks for help."
      ].join("\n")
    }
  });

  await prisma.featureFlag.upsert({
    where: { key: "leagues" },
    update: { enabled: false },
    create: {
      key: "leagues",
      enabled: false,
      description: "League gamification is disabled for MVP."
    }
  });

  for (const lesson of lessonSeeds) {
    const template = await prisma.lessonTemplate.upsert({
      where: { slug: lesson.slug },
      update: {
        titleKo: lesson.titleKo,
        titleEn: lesson.titleEn,
        level: lesson.level,
        category: lesson.category,
        status: "PUBLISHED"
      },
      create: {
        slug: lesson.slug,
        titleKo: lesson.titleKo,
        titleEn: lesson.titleEn,
        level: lesson.level,
        category: lesson.category,
        status: "PUBLISHED"
      }
    });

    const version = await prisma.lessonTemplateVersion.upsert({
      where: { lessonTemplateId_version: { lessonTemplateId: template.id, version: 1 } },
      update: {
        objective: `${lesson.titleKo} 상황에서 핵심 표현을 사용해 말하기`,
        status: "PUBLISHED",
        promptVersionId: promptVersion.id
      },
      create: {
        lessonTemplateId: template.id,
        objective: `${lesson.titleKo} 상황에서 핵심 표현을 사용해 말하기`,
        estimatedDuration: 900,
        version: 1,
        status: "PUBLISHED",
        promptVersionId: promptVersion.id
      }
    });

    await prisma.lessonStageTemplate.deleteMany({ where: { lessonTemplateVersionId: version.id } });
    await prisma.materialCard.deleteMany({ where: { lessonTemplateVersionId: version.id } });
    await prisma.targetExpression.deleteMany({ where: { lessonTemplateVersionId: version.id } });

    await prisma.lessonStageTemplate.createMany({
      data: stageTemplates.map(([stageType, sequence, plannedDurationSeconds, objective, backchannelEnabled]) => ({
        lessonTemplateVersionId: version.id,
        stageType,
        sequence,
        plannedDurationSeconds,
        objective,
        entryCondition: "Previous stage completed or time policy forces transition.",
        exitCondition: "Objective met or planned duration elapsed.",
        promptInstruction: `Guide the learner through ${objective}.`,
        backchannelEnabled,
        correctionPolicy: "IMMEDIATE_IMPORTANT_ONLY"
      }))
    });

    const expression = await prisma.targetExpression.create({
      data: {
        lessonTemplateVersionId: version.id,
        text: lesson.slug.includes("hotel") ? "I'd like to check in." : "Could I get...?",
        meaningKo: lesson.slug.includes("hotel") ? "체크인하고 싶습니다." : "...을 받을 수 있을까요?",
        examples: ["Could I get a quiet room?", "I'd like to check in, please."],
        alternatives: ["Can I have...?", "I would like..."],
        level: lesson.level,
        grammarTags: ["request", "polite-expression"]
      }
    });

    await prisma.materialCard.create({
      data: {
        lessonTemplateVersionId: version.id,
        type: "SITUATION",
        title: lesson.titleKo,
        body: `${lesson.titleKo} 상황에서 한 문장으로 요청하고 follow-up 질문에 답합니다.`,
        imageUrl: `/assets/lessons/${lesson.slug}.png`,
        targetExpressionIds: [expression.id],
        hints: ["천천히 말해도 괜찮아요.", "핵심 표현을 한 번 사용해 보세요."],
        sequence: 1
      }
    });
  }

  console.log(`Seeded ${lessonSeeds.length} lesson templates, tutor ${tutor.name}, prompt v${promptVersion.version}.`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
