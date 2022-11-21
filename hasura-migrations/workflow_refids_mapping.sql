create table workflow_refids_mapping
(
    id            bigserial                                            not null
        constraint workflow_refids_mapping_pkey
            primary key,
    grade         integer                                              not null,
    subject       text                                                 not null,
    competency_id integer                                              not null
        constraint workflow_refids_mapping_competency_id_fkey
            references competency_mapping
            on update set null on delete set null,
    type          text                                                 not null,
    is_active     boolean                  default true                not null,
    ref_ids       jsonb                    default jsonb_build_array() not null,
    created_at    timestamp with time zone default now()               not null,
    updated_at    timestamp with time zone default now()               not null,
    month         varchar                                              not null,
    constraint workflow_refids_mapping_competency_id_grade_subject_type_month_
        unique (competency_id, grade, subject, type, month)
);

create trigger set_public_workflow_refids_mapping_updated_at
    before update
    on workflow_refids_mapping
    for each row
execute procedure set_current_timestamp_updated_at();

comment on trigger set_public_workflow_refids_mapping_updated_at on workflow_refids_mapping is 'trigger to set value of column "updated_at" to current timestamp on row update';