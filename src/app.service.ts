import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map } from 'rxjs';
import { exec } from 'child_process';

@Injectable()
export class AppService {
  private readonly hasuraGraphqlUrl;
  private readonly hasuraGraphqlSecret;

  protected readonly logger = new Logger(AppService.name); // logger instance

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.hasuraGraphqlUrl = configService.get<string>('HASURA_GRAPHQL_URL');
    this.hasuraGraphqlSecret = configService.get<string>('HASURA_ADMIN_SECRET');
  }

  getHello(): string {
    return 'Hello World!';
  }

  async hasuraGraphQLCall(
    data,
    url: string = this.hasuraGraphqlUrl,
    headers = {
      'x-hasura-admin-secret': this.hasuraGraphqlSecret,
      'Content-Type': 'application/json',
    },
  ) {
    return await lastValueFrom(
      this.httpService
        .post(url, data, {
          headers: headers,
        })
        .pipe(
          map((res) => {
            return res.status == 200 ? res.data : null;
          }),
        ),
    );
  }

  public async convertExcelToOdkForm(
    inputFile: string,
    outputFile: string,
  ): Promise<boolean> {
    // Make sure the binary is installed system wide; Ref: https://github.com/XLSForm/pyxform
    const command = 'xls2xform ' + inputFile + ' ' + outputFile;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return await new Promise(function (resolve, reject) {
      exec(command, (error) => {
        if (error) {
          self.logger.error('Error generating ODK form: ', error);
          reject(false);
          return;
        }
        resolve(true);
      });
    })
      .then((success: boolean) => {
        return success;
      })
      .catch((failed: boolean) => {
        return failed;
      });
  }
}
