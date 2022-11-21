# quml2xform

## Description

QuML to ODK form conversion tool written in [Nest](https://github.com/nestjs/nest) framework.

## Installation

```bash
$ yarn install
```

## Running the app
Create `.env` file (can be copied from `.env.example`) and configure all the variables as per need & development environment.

### Using docker
Simply hit `docker-compose up -d`, or use manual installation as per below steps:

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

> **Note:**
> For Manual installation, make sure the python tool is installed system wide: https://github.com/XLSForm/pyxform#running-the-latest-release-of-pyxform. We are using this tool to generate XML from XLSX form using command line utility available from the tool:
```xls2xform path_to_XLSForm [output_path]```

## Routes
### For Single Request
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

### For Bulk requests
```
POST {{url}}/quml-to-odk/bulk
[
    {
        "randomQuestionsCount": 5,
        "board": "CBSE",
        "grade": "Class 6",
        "subject": "Mathematics",
        "competency":"Data Handling",
        "qType": "MCQ"
    },
    ...
]
```
The params `randomQuestionsCount`, `board`, `grade`, `subject`, `competency` can all be sent as per need & the filters will be applied under the hood. `qType` for now is limited to "MCQ" only.

### To generate forms via CSV-JSON
A JSON body generated from the CSV should be passed as per below format:
```
POST {{url}}/quml-to-odk/via-json?randomQuestionsCount=3&board=State (Haryana)
[
  {
    "Grade": "Class 6",
    "Subject": "English",
    "Question": "How old was Tansen when he went away with Swami Haridas?",
    "option 1": "Twelve years old&nbsp;",
    "option 2": "Ten years old&nbsp;",
    "option 3": "Nine years old&nbsp;",
    "option 4": "Eleven years old&nbsp;",
    "CorrectAnswer(1/2/3/4)": 2,
    "Competencies": "ENG605 Students can respond to questions by gathering information from notices, charts, diagrams, etc.",
  },
    ...
]
```
CSV to JSON conversion tool: https://csvjson.com/csv2json

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