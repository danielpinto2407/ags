alter table public.tenants
  alter column theme set default '{
    "logoUrl": null,
    "primaryColor": "#7b2545",
    "secondaryColor": "#572239",
    "backgroundColor": "#f4eae3",
    "accentColor": "#d8bac4",
    "surfaceColor": "#fff9f6",
    "textColor": "#2b2528",
    "mutedColor": "#76696d",
    "borderColor": "#e5d8d2",
    "warmAccentColor": "#c4a47e",
    "softAccentColor": "#c4b1d2"
  }'::jsonb;

update public.tenants
set theme = theme || '{
  "primaryColor": "#7b2545",
  "secondaryColor": "#572239",
  "backgroundColor": "#f4eae3",
  "accentColor": "#d8bac4",
  "surfaceColor": "#fff9f6",
  "textColor": "#2b2528",
  "mutedColor": "#76696d",
  "borderColor": "#e5d8d2",
  "warmAccentColor": "#c4a47e",
  "softAccentColor": "#c4b1d2"
}'::jsonb
where subdomain = 'ags';