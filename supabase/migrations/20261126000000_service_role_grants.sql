-- 서버 함수(service_role)가 표와 함수를 쓸 수 있게 권한을 직접 줍니다.
-- 새로 만든 Supabase 프로젝트는 새 표에 권한을 자동으로 주지 않아서,
-- 이 파일이 없으면 서버 함수가 설정·사연 표를 읽지 못해 "사연을 받지 않아요"가 뜹니다.
-- 시청자(anon / authenticated) 권한은 앞 파일들에서 하나하나 정해 두었으니 건드리지 않아요.

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- 앞으로 새로 만드는 표와 함수에도 같은 권한
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
