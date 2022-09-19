# quml2xform

## Description

QuML to ODK form conversion tool written in [Nest](https://github.com/nestjs/nest) framework.

## Installation

```bash
$ yarn install
```

## Running the app

Create `.env` file (can be copied from `.env.example`) and configure all the variables as per need & development environment.

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

Make sure the python tool is installed system wide: https://github.com/XLSForm/pyxform#running-the-latest-release-of-pyxform. We are using this tool to generate XML from XLSX form using command line utility available from the tool:

```xls2xform path_to_XLSForm [output_path]```

## Routes
```
POST {{url}}/quml-to-odk
{
    "randomQuestionsCount": 5,
    "board": "CBSE",
    "grade": "Class 6",
    "subject": "Mathematics",
    "competency":"Data Handling",
    "qType": "MCQ"
}
```
The params `randomQuestionsCount`, `board`, `grade`, `subject`, `competency` can all be sent as per need & the filters will be applied under the hood. `qType` for now is limited to "MCQ" only.

## Form IDs upload on Hasura
- Ensure the tables `competencies` & `workflow_refids_mapping` exists on Hasura DB. Migration files exists at path `hasura-migrations/`
- Configure variables `HASURA_DUMP_FORMS_MAPPING`, `HASURA_GRAPHQL_URL` & `HASURA_ADMIN_SECRET`

That's it. Now form IDs mapping will be uploaded on Hasura in the above mentioned tables.

## Generated Files
- XLSX files will be generated at path: `./gen/xlsx`
- XML files will be generated at path: `./gen/xml`
- Image files will be generated at path: `./gen/images`

## Postman Collection link
https://www.getpostman.com/collections/4b5106be932558e0b96a