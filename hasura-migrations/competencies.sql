create table competencies
(
    id         serial                                 not null
        constraint competencies_pkey
            primary key,
    name       varchar                                not null
        constraint competencies_name_key
            unique,
    created_at timestamp with time zone default now() not null
);