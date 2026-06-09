-- Chay file nay bang SQLTools: mo Command Palette -> SQLTools: Run Query
-- Connection da cau hinh san trong workspace voi ten: ARSS Postgres

select current_database() as database_name, current_user as db_user;

select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select id, email, full_name, tier
from users
order by email nulls last
limit 20;

select id, title, report_type, chapter_count, created_at
from research_articles
order by created_at desc nulls last
limit 20;

select * from users;
select * from llm_usages;