-- Tabela para armazenar ligações a folhas de leads (Google Sheets, etc.)
create table folhas_leads (
  id         uuid        primary key default gen_random_uuid(),
  nome       text        not null,
  url        text        not null,
  estado     text        not null default 'por_iniciar'
               check (estado in ('por_iniciar', 'em_progresso', 'terminado')),
  notas      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table folhas_leads enable row level security;

create policy "autenticados_select_folhas" on folhas_leads
  for select using (auth.role() = 'authenticated');

create policy "autenticados_insert_folhas" on folhas_leads
  for insert with check (auth.role() = 'authenticated');

create policy "autenticados_update_folhas" on folhas_leads
  for update using (auth.role() = 'authenticated');

create policy "autenticados_delete_folhas" on folhas_leads
  for delete using (auth.role() = 'authenticated');

-- Trigger updated_at
create or replace function set_updated_at_folhas_leads()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger folhas_leads_updated_at
  before update on folhas_leads
  for each row execute function set_updated_at_folhas_leads();
