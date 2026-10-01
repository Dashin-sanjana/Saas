import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@smartweek.app" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@smartweek.app",
      passwordHash,
      timezone: "Asia/Colombo",
      onboardingCompleted: true,
      preferences: {
        create: {
          wakeTime: "06:30",
          sleepTime: "23:00",
          weekdayCutoffTime: "18:00",
          timezone: "Asia/Colombo"
        }
      }
    }
  });

  await prisma.event.createMany({
    data: [
      {
        userId: user.id,
        title: "Formal Methods Lecture",
        category: "LECTURE",
        dayOfWeek: "MONDAY",
        startTime: "09:00",
        endTime: "11:00",
        location: "Room A"
      },
      {
        userId: user.id,
        title: "Gym",
        category: "GYM",
        dayOfWeek: "WEDNESDAY",
        startTime: "18:30",
        endTime: "19:30"
      }
    ]
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
