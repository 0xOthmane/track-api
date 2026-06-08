import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { EvaluationType, Role } from '../src/generated/prisma/enums';
import { auth } from '../src/lib/auth';
import { getEnv } from '../src/config/env.config';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: getEnv().DATABASE_URL }),
});

type SeedUser = {
  id: string;
  email: string;
  role: (typeof Role)[keyof typeof Role];
  name: string;
};

async function createSeedUser(
  name: string,
  email: string,
  password: string,
  role: (typeof Role)[keyof typeof Role],
): Promise<SeedUser> {
  const created = await auth.api.createUser({
    body: {
      name,
      email,
      password,
      data: {
        role,
      },
    },
  });

  return {
    id: created.user.id,
    email,
    role,
    name,
  };
}

async function clearDatabase() {
  await prisma.$transaction([
    prisma.verification.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.grade.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.attendanceSession.deleteMany(),
    prisma.evaluationWeight.deleteMany(),
    prisma.course.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  await clearDatabase();

  const admin = await createSeedUser(
    'Admin User',
    'admin@example.com',
    'Admin123!',
    Role.ADMIN,
  );
  const teacher = await createSeedUser(
    'Ada Teacher',
    'teacher@example.com',
    'Teacher123!',
    Role.TEACHER,
  );
  const backupTeacher = await createSeedUser(
    'Grace Teacher',
    'teacher2@example.com',
    'Teacher123!',
    Role.TEACHER,
  );
  const student = await createSeedUser(
    'Sam Student',
    'student@example.com',
    'Student123!',
    Role.STUDENT,
  );
  const backupStudent = await createSeedUser(
    'Taylor Student',
    'student2@example.com',
    'Student123!',
    Role.STUDENT,
  );

  const dataStructures = await prisma.course.create({
    data: {
      name: 'Introduction to Data Structures',
      description: 'Core structures, complexity, and practical implementation.',
      capacity: 30,
      semester: 'Fall 2024',
      teacherId: teacher.id,
    },
  });

  const discreteMath = await prisma.course.create({
    data: {
      name: 'Discrete Mathematics',
      description: 'Logic, proofs, counting, and graph theory.',
      capacity: 24,
      semester: 'Spring 2025',
      teacherId: backupTeacher.id,
    },
  });

  await prisma.evaluationWeight.createMany({
    data: [
      { courseId: dataStructures.id, type: EvaluationType.EXAM, weight: 60 },
      { courseId: dataStructures.id, type: EvaluationType.QUIZ, weight: 20 },
      { courseId: dataStructures.id, type: EvaluationType.PROJECT, weight: 20 },
      { courseId: discreteMath.id, type: EvaluationType.EXAM, weight: 50 },
      { courseId: discreteMath.id, type: EvaluationType.QUIZ, weight: 30 },
      { courseId: discreteMath.id, type: EvaluationType.PROJECT, weight: 20 },
    ],
  });

  await prisma.enrollment.createMany({
    data: [
      { courseId: dataStructures.id, studentId: student.id },
      { courseId: dataStructures.id, studentId: backupStudent.id },
      { courseId: discreteMath.id, studentId: student.id },
    ],
  });

  await prisma.grade.createMany({
    data: [
      {
        courseId: dataStructures.id,
        studentId: student.id,
        createdById: teacher.id,
        evaluationType: EvaluationType.EXAM,
        value: 16,
      },
      {
        courseId: dataStructures.id,
        studentId: student.id,
        createdById: teacher.id,
        evaluationType: EvaluationType.QUIZ,
        value: 18,
      },
      {
        courseId: dataStructures.id,
        studentId: backupStudent.id,
        createdById: teacher.id,
        evaluationType: EvaluationType.PROJECT,
        value: 19,
      },
      {
        courseId: discreteMath.id,
        studentId: student.id,
        createdById: backupTeacher.id,
        evaluationType: EvaluationType.EXAM,
        value: 14,
      },
      {
        courseId: discreteMath.id,
        studentId: student.id,
        createdById: admin.id,
        evaluationType: EvaluationType.QUIZ,
        value: 17,
      },
    ],
  });

  const sessionOne = await prisma.attendanceSession.create({
    data: {
      courseId: dataStructures.id,
      date: new Date('2024-09-02T08:00:00.000Z'),
    },
  });

  const sessionTwo = await prisma.attendanceSession.create({
    data: {
      courseId: dataStructures.id,
      date: new Date('2024-09-09T08:00:00.000Z'),
    },
  });

  const sessionThree = await prisma.attendanceSession.create({
    data: {
      courseId: discreteMath.id,
      date: new Date('2025-02-10T08:00:00.000Z'),
    },
  });

  await prisma.attendanceRecord.createMany({
    data: [
      { sessionId: sessionOne.id, studentId: student.id, present: true },
      { sessionId: sessionOne.id, studentId: backupStudent.id, present: true },
      { sessionId: sessionTwo.id, studentId: student.id, present: false },
      { sessionId: sessionTwo.id, studentId: backupStudent.id, present: true },
      { sessionId: sessionThree.id, studentId: student.id, present: true },
    ],
  });

  console.log('Seeded test data successfully');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });