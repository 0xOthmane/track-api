jest.mock('../lib/auth', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('./admin-stats-cache', () => ({
  getCachedAdminStats: jest.fn(),
  setCachedAdminStats: jest.fn(),
  clearCachedAdminStats: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;
  let getSemesterReportCsv: jest.Mock;
  let adminService: {
    getSemesterReportCsv: jest.Mock;
    importEnrollments: jest.Mock;
    getStats: jest.Mock;
    sendSemesterSummary: jest.Mock;
  };

  beforeEach(async () => {
    getSemesterReportCsv = jest.fn();
    adminService = {
      getSemesterReportCsv,
      importEnrollments: jest.fn(),
      getStats: jest.fn(),
      sendSemesterSummary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: adminService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('streams semester csv with csv headers', async () => {
    adminService.getSemesterReportCsv.mockResolvedValue('Student name\n');
    const setHeader = jest.fn();
    const send = jest.fn();
    const res = {
      setHeader,
      send,
    } as unknown as Response;

    await controller.getSemesterReport('Fall 2024', res);

    expect(getSemesterReportCsv.mock.calls).toEqual([['Fall 2024']]);
    expect(setHeader.mock.calls).toEqual([
      ['Content-Type', 'text/csv'],
      ['Content-Disposition', 'attachment; filename="semester-Fall 2024.csv"'],
    ]);
    expect(send.mock.calls).toEqual([['Student name\n']]);
  });

  it('returns enrollment import results', async () => {
    adminService.importEnrollments.mockResolvedValue({
      enrolled: 1,
      skipped: [],
    });

    await expect(
      controller.importEnrollments('studentId,courseId'),
    ).resolves.toEqual({ enrolled: 1, skipped: [] });
  });

  it('returns semester stats', async () => {
    adminService.getStats.mockResolvedValue({
      semester: 'Fall 2024',
      totalStudents: 2,
      totalCourses: 1,
      averageGradePerCourse: [],
      globalAtRiskCount: 0,
    });

    await expect(
      controller.getStats({ semester: 'Fall 2024' }),
    ).resolves.toMatchObject({ semester: 'Fall 2024' });
  });

  it('triggers the semester summary flow', async () => {
    adminService.sendSemesterSummary.mockResolvedValue({
      semester: 'Fall 2024',
      sent: true,
      message: 'Simulated summary email logged successfully',
      stats: {
        semester: 'Fall 2024',
        totalStudents: 2,
        totalCourses: 1,
        averageGradePerCourse: [],
        globalAtRiskCount: 0,
      },
    });

    await expect(controller.sendSemesterSummary('Fall 2024')).resolves.toEqual({
      semester: 'Fall 2024',
      sent: true,
      message: 'Simulated summary email logged successfully',
      stats: {
        semester: 'Fall 2024',
        totalStudents: 2,
        totalCourses: 1,
        averageGradePerCourse: [],
        globalAtRiskCount: 0,
      },
    });
  });
});
