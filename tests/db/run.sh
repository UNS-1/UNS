#!/usr/bin/env bash
# Usage: PSQL="psql" tests/db/run.sh   (needs a PostgreSQL superuser connection; creates and drops a scratch database)
set -euo pipefail
PSQL=${PSQL:-psql}; DB=uns_test_$$; D="$(cd "$(dirname "$0")" && pwd)"; B="$D/../../backend"
$PSQL -q -d postgres -c "create database $DB"; trap '$PSQL -q -d postgres -c "drop database $DB" >/dev/null' EXIT
for f in "$D/stub.sql" "$B/01_schema.sql" "$B/02_rls.sql" "$B/05_hardening.sql"; do $PSQL -q -d $DB -v ON_ERROR_STOP=1 -f "$f"; done
# pre-existing child (old age group 8-10): the personalization migration must keep it working
$PSQL -q -d $DB -v ON_ERROR_STOP=1 -c "insert into child_profiles(nickname,age_group) values ('Legacy','8-10')"
# a pre-existing activity row, to prove the framework migration keeps current data
$PSQL -q -d $DB -v ON_ERROR_STOP=1 -c "insert into activities(kind,title_ar,title_en) values ('puzzle','لغز قديم','Legacy puzzle')"
$PSQL -q -d $DB -v ON_ERROR_STOP=1 -f "$B/06_activity_framework.DRAFT.sql"
$PSQL -q -d $DB -v ON_ERROR_STOP=1 -v migration="$B/06_activity_framework.DRAFT.sql" -f "$D/framework.sql"
$PSQL -q -d $DB -v ON_ERROR_STOP=1 -f "$B/07_personalization.sql"
$PSQL -q -d $DB -v ON_ERROR_STOP=1 -v migration07="$B/07_personalization.sql" -f "$D/personalization.sql"
# a symptom report written before the body-map migration must stay readable and unchanged
$PSQL -q -d $DB -v ON_ERROR_STOP=1 -c "insert into symptom_reports(child_id,body_areas,pain_score) select id,'{head}',2 from child_profiles where nickname='Rana'"
$PSQL -q -d $DB -v ON_ERROR_STOP=1 -f "$B/08_body_marks.sql"
$PSQL -q -d $DB -v ON_ERROR_STOP=1 -v migration08="$B/08_body_marks.sql" -f "$D/bodymap.sql"
$PSQL -q -d $DB -v ON_ERROR_STOP=1 -f "$D/flow.sql"
