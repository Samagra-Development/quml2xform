CREATE TABLE public.workflow_refids_mapping (
    id bigint NOT NULL,
    grade integer NOT NULL,
    subject text NOT NULL,
    competency_id integer NOT NULL,
    type text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    ref_ids jsonb DEFAULT jsonb_build_array() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.workflow_refids_mapping_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.workflow_refids_mapping_id_seq OWNED BY public.workflow_refids_mapping.id;

ALTER TABLE ONLY public.workflow_refids_mapping ALTER COLUMN id SET DEFAULT nextval('public.workflow_refids_mapping_id_seq'::regclass);

ALTER TABLE ONLY public.workflow_refids_mapping
    ADD CONSTRAINT workflow_refids_mapping_competency_id_grade_subject_type_key UNIQUE (competency_id, grade, subject, type);

ALTER TABLE ONLY public.workflow_refids_mapping
    ADD CONSTRAINT workflow_refids_mapping_pkey PRIMARY KEY (id);

CREATE TRIGGER set_public_workflow_refids_mapping_updated_at BEFORE UPDATE ON public.workflow_refids_mapping FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

COMMENT ON TRIGGER set_public_workflow_refids_mapping_updated_at ON public.workflow_refids_mapping IS 'trigger to set value of column "updated_at" to current timestamp on row update';