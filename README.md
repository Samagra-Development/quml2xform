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
    "boards": ["CBSE"],
    "grades": ["Class 6"],
    "subjects": ["Mathematics"],
    "competencies": [
        "Data Handling"
    ],
    "qType": "MCQ"
}
```

## Generated Files
- XLSX files will be generated at path: `./gen/xlsx`
- XML files will be generated at path: `./gen/xml`
- Image files will be generated at path: `./gen/images`