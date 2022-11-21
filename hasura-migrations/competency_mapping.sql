create table competency_mapping
(
    grade            text                  not null,
    subject          text,
    learning_outcome text,
    competency_id    serial                not null
        constraint competency_mapping_pkey
            primary key,
    month            text,
    is_active        boolean default false not null
);