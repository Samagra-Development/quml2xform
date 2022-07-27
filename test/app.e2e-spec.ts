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

  it('/quml-to-odk (POST)', () => {
    const body = {
      randomQuestionsCount: 1,
      boards: ['CBSE'],
      grades: ['Class 6'],
      subjects: ['Mathematics'],
      competencies: ['Data Handling'],
      qType: 'MCQ',
    };
    return request(app.getHttpServer())
      .post('/quml-to-odk')
      .send(body)
      .expect(201)
      .expect((res) => {
        if (!res.body.xlsxFile || !fs.existsSync(res.body.xlsxFile)) {
          throw Error('Failed creating file..');
        }
        if (!res.body.odkFile || !fs.existsSync(res.body.odkFile)) {
          throw Error('Failed creating file..');
        }
      });
  });
});
