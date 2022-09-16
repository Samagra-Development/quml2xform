import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  jest.setTimeout(50000);
  it('/quml-to-odk (POST)', () => {
    const body = {
      randomQuestionsCount: 5,
      board: 'State (Haryana)',
      grade: 'Class 6',
      subject: 'Mathematics',
      competencies: [
        'MAT601 विद्यार्थी किसी प्राकृत संख्या को विभिन्न तरीकों से पढ़, लिख, तुलना और व्याख्या कर सकते हैं और उनपर चारों संक्रियाएं कर सकते हैं।',
      ],
      qType: 'MCQ',
    };
    return request(app.getHttpServer())
      .post('/quml-to-odk')
      .send(body)
      .expect(201)
      .expect((res) => {
        if (!res.body.xlsxFiles || !fs.existsSync(res.body.xlsxFiles[0])) {
          throw new Error('Test failed. No files created..');
        }
        if (!res.body.odkFiles || !fs.existsSync(res.body.odkFiles[0])) {
          throw new Error('Test failed. No files created..');
        }
        if (!res.body.formIds || res.body.formIds.length === 0) {
          throw new Error('Test failed. No forms uploaded..');
        }
        console.log('Test successful. Form IDs: ', res.body.formIds);
      });
  });
});
