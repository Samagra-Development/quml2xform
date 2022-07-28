# quml2xform

## Description

QuML to ODK form conversion tool written in [Nest](https://github.com/nestjs/nest) framework.

## Installation

```bash
$ npm install
```

## Running the app

Create `.env` file (can be copied from `.env.example`) and configure all the variables as per need & development environment.

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

Make sure the python tool is installed system wide: https://github.com/XLSForm/pyxform#running-the-latest-release-of-pyxform. We are using this tool to generate XML from XLSX form using command line utility available from the tool:

```xls2xform path_to_XLSForm [output_path]```

## Routes
```
POST {{url}}/quml-to-odk
{
    "randomQuestionsCount": 5,
    "boards": ["CBSE"],
    "grades": ["Class 6"],
    "subjects": ["Mathematics"],
    "competencies": [
        "Data Handling"
    ],
    "qType": "MCQ"
}
```
