-- Create debate_topics table for debate planning page
create table debate_topics (
  id uuid default gen_random_uuid() primary key,
  point text not null,
  person text not null default 'Yugandhar, Rohith, Pragnay',
  topic_tags text[] default '{}',
  section text not null check (section in (
    'zoho_arguments',
    'zoho_rebuttal_against_google', 
    'zoho_common_answers',
    'google_arguments',
    'google_rebuttal_against_zoho',
    'google_common_answers'
  )),
  position integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for efficient section-based queries
create index idx_debate_topics_section on debate_topics(section);
create index idx_debate_topics_position on debate_topics(position);

-- Enable RLS
alter table debate_topics enable row level security;

-- Create policies for public access (no authentication required)
create policy "Anyone can view debate topics" on debate_topics
  for select using (true);

create policy "Anyone can insert debate topics" on debate_topics
  for insert with check (true);

create policy "Anyone can update debate topics" on debate_topics
  for update using (true);

create policy "Anyone can delete debate topics" on debate_topics
  for delete using (true);

-- Grant permissions to anon and authenticated roles
grant select on debate_topics to anon, authenticated;
grant insert on debate_topics to anon, authenticated;
grant update on debate_topics to anon, authenticated;
grant delete on debate_topics to anon, authenticated;

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_debate_topics_updated_at 
    BEFORE UPDATE ON debate_topics 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();